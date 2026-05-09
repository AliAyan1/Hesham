import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { refreshJobSeekerCvCompletionPct } from "@/lib/cv/refresh-jobseeker-completion";
import { resolveJobSeekerDbUserForUpload } from "@/lib/resolve-session-user";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

/** Many Windows/browsers omit `Blob.type`; infer from magic bytes instead. */
function inferExtFromMagic(buf: Buffer): string | undefined {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return ".png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return ".webp";
  return undefined;
}

const AVATAR_DIR_FS = join(process.cwd(), "public", "uploads", "avatars");
const AVATAR_PREFIX = "/uploads/avatars/";

async function removeStoredAvatarFile(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl?.startsWith(AVATAR_PREFIX)) return;
  const rel = imageUrl.slice(1).split("/"); // uploads, avatars, filename
  try {
    await unlink(join(process.cwd(), "public", ...rel));
  } catch {
    // ignore
  }
}

export async function POST(request: NextRequest): Promise<
  NextResponse<
    | { success: true; data: { image: string } }
    | { success: false; error: string; code?: "SESSION_STALE" }
  >
> {
  const session = await getServerSession();
  const roleOk =
    session?.user?.role === UserRole.JOBSEEKER ||
    String(session?.user?.role ?? "").toUpperCase() === "JOBSEEKER";
  if (!session?.user?.id || !roleOk) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Photo must be 2 MB or smaller" },
      { status: 400 },
    );
  }

  const mime = file.type.split(";")[0]?.trim()?.toLowerCase() ?? "";
  const ext = ALLOWED.get(mime) ?? inferExtFromMagic(buffer);
  if (!ext) {
    return NextResponse.json({ success: false, error: "Use JPG, PNG, or WebP" }, { status: 400 });
  }

  const prisma = getPrisma();
  /** Id + JWT email + insensitive match (fixes stale JWTs / missing session.email). */
  const resolved = await resolveJobSeekerDbUserForUpload(request, session);

  if (!resolved) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Could not tie this login to your account in the database. Sign out from the sidebar, close the tab, then sign in again. If this started after DATABASE_URL changed, logging in again is required.",
        code: "SESSION_STALE",
      },
      { status: 401 },
    );
  }

  await mkdir(AVATAR_DIR_FS, { recursive: true });

  const userId = resolved.id;
  const basename = `${userId}_${Date.now()}${ext}`;
  const writtenPath = join(AVATAR_DIR_FS, basename);
  await writeFile(writtenPath, buffer);

  const publicUrl = `${AVATAR_PREFIX}${basename}`;

  try {
    await removeStoredAvatarFile(resolved.image);
    await prisma.user.update({
      where: { id: userId },
      data: { image: publicUrl },
      select: { id: true },
    });
    await refreshJobSeekerCvCompletionPct(userId);
  } catch {
    try {
      await unlink(writtenPath);
    } catch {
      // ignore cleanup failure
    }
    return NextResponse.json({ success: false, error: "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { image: publicUrl } }, { status: 200 });
}

export async function DELETE(request: NextRequest): Promise<
  NextResponse<{ success: true } | { success: false; error: string }>
> {
  const session = await getServerSession();
  const roleOkDel =
    session?.user?.role === UserRole.JOBSEEKER ||
    String(session?.user?.role ?? "").toUpperCase() === "JOBSEEKER";
  if (!session?.user?.id || !roleOkDel) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();

  const existing = await resolveJobSeekerDbUserForUpload(request, session);

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Could not tie this login to your account in the database. Sign out, then sign in again.",
        code: "SESSION_STALE",
      },
      { status: 401 },
    );
  }

  await removeStoredAvatarFile(existing.image);

  await prisma.user.update({
    where: { id: existing.id },
    data: { image: null },
    select: { id: true },
  });

  await refreshJobSeekerCvCompletionPct(existing.id);

  return NextResponse.json({ success: true }, { status: 200 });
}
