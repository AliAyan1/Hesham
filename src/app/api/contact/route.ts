import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
});

export async function POST(request: Request): Promise<
  NextResponse<{ ok: true } | { error: string }>
> {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    await prisma.contact.create({ data: parsed.data });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

