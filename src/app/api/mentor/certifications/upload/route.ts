import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import {
  MENTOR_CERT_ALLOWED_MIMES,
  MENTOR_CERT_MAX_BYTES,
  MENTOR_CERT_MAX_COUNT,
} from "@/lib/mentor/certification-types";

const CERT_DIR = join(process.cwd(), "public", "uploads", "mentor-certifications");
const CERT_PREFIX = "/uploads/mentor-certifications/";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const name = String(formData?.get("name") ?? "").trim();
  const issuer = String(formData?.get("issuer") ?? "").trim() || null;
  const issuedAtRaw = String(formData?.get("issuedAt") ?? "").trim();

  if (!name || name.length > 200) {
    return NextResponse.json({ success: false, error: "Certification name is required" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MENTOR_CERT_MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File must be 5 MB or smaller" },
      { status: 400 },
    );
  }

  const mime = file.type.split(";")[0]?.trim()?.toLowerCase() ?? "";
  if (!MENTOR_CERT_ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { success: false, error: "Allowed formats: PDF, JPEG, PNG, WebP" },
      { status: 400 },
    );
  }

  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    return NextResponse.json({ success: false, error: "Unsupported file type" }, { status: 400 });
  }

  let issuedAt: Date | null = null;
  if (issuedAtRaw) {
    const parsed = new Date(issuedAtRaw);
    if (!Number.isNaN(parsed.getTime())) issuedAt = parsed;
  }

  const prisma = getPrisma();
  const count = await prisma.mentorCertification.count({
    where: { mentorId: auth.ctx.mentorId },
  });
  if (count >= MENTOR_CERT_MAX_COUNT) {
    return NextResponse.json(
      { success: false, error: `Maximum ${MENTOR_CERT_MAX_COUNT} certifications allowed` },
      { status: 400 },
    );
  }

  try {
    await mkdir(CERT_DIR, { recursive: true });
    const originalName = file instanceof File && file.name ? file.name : `cert${ext}`;
    const filename = `${auth.ctx.mentorId}-${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
    await writeFile(join(CERT_DIR, filename), buffer);

    const fileUrl = `${CERT_PREFIX}${filename}`;
    const row = await prisma.mentorCertification.create({
      data: {
        mentorId: auth.ctx.mentorId,
        name,
        issuer,
        issuedAt,
        fileUrl,
        fileName: originalName,
        mimeType: mime,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        certification: {
          id: row.id,
          name: row.name,
          issuer: row.issuer,
          issuedAt: row.issuedAt?.toISOString() ?? null,
          fileUrl: row.fileUrl,
          fileName: row.fileName,
          mimeType: row.mimeType,
          createdAt: row.createdAt.toISOString(),
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
