import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";

const MAX_BYTES = 8 * 1024 * 1024;
const OFFERS_DIR = join(process.cwd(), "public", "uploads", "offers");
const OFFERS_PREFIX = "/uploads/offers/";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
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
      { success: false, error: "File must be 8 MB or smaller" },
      { status: 400 },
    );
  }

  const mime = file.type.split(";")[0]?.trim()?.toLowerCase() ?? "";
  const name = file instanceof File && file.name ? file.name : "offer.pdf";
  const ext =
    mime === "application/pdf"
      ? ".pdf"
      : name.toLowerCase().endsWith(".pdf")
        ? ".pdf"
        : null;
  if (!ext) {
    return NextResponse.json({ success: false, error: "PDF only" }, { status: 400 });
  }

  await mkdir(OFFERS_DIR, { recursive: true });
  const filename = `${session.user.id}-${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  await writeFile(join(OFFERS_DIR, filename), buffer);

  const fileUrl = `${OFFERS_PREFIX}${filename}`;
  return NextResponse.json({
    success: true,
    data: { fileUrl, fileName: name },
  });
}
