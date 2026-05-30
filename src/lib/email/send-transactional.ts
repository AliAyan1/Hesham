/**
 * Sends a transactional email via Resend when RESEND_API_KEY is set.
 * Fails silently when not configured (no console output).
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
