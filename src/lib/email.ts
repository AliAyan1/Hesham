import type { ReactElement } from "react";
import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string | null {
  const configured = process.env.FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? null;
  /** Resend sandbox — works in dev until qudrahtech.sa domain is verified */
  if (process.env.NODE_ENV !== "production" && process.env.RESEND_USE_VERIFIED_DOMAIN !== "true") {
    return "QudrahTech <onboarding@resend.dev>";
  }
  return configured;
}

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: ReactElement;
}): Promise<{ id: string } | null> {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) {
    return null;
  }
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      react: template,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}
