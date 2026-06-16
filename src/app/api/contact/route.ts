import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const CONTACT_INBOX =
  process.env.CONTACT_INBOX_EMAIL ?? "support@basalim-consulting.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
    const limited = rateLimit(`contact:${clientIp(request)}`, 5, 15 * 60 * 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    const { name, email, subject, message } = parsed.data;
    await prisma.contact.create({ data: { name, email, subject, message } });

    const sent = await sendTransactionalEmail({
      to: CONTACT_INBOX,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: `
        <h2>New contact form message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `.trim(),
    });

    if (!sent) {
      console.error("Contact form saved but email delivery failed", {
        to: CONTACT_INBOX,
        from: email,
      });
      return NextResponse.json({ error: "Email delivery failed" }, { status: 503 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

