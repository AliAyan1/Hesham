"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  subject: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(4000),
});

type FormValues = z.infer<typeof schema>;

type Props = { locale: string };

export function QudratakSupportForm({ locale }: Props) {
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [form, setForm] = useState<FormValues>({
    name: "",
    email: "",
    subject: "technical",
    message: "",
  });

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setStatus("idle");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    const d = parsed.data;
    const subject = `Qudratak Support | ${d.subject}`;
    const message = [`Subject category: ${d.subject}`, "", d.message].join("\n");

    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: d.name, email: d.email, subject, message }),
        });
        setStatus(res.ok ? "success" : "error");
      } catch {
        setStatus("error");
      }
    });
  }

  if (status === "success") {
    return (
      <p className="rounded-xl bg-[#1A6B5A]/10 p-6 text-center text-[#1A6B5A]">
        {isAr ? "تم الإرسال بنجاح!" : "Message sent successfully!"}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-8 shadow-lg">
      {status === "error" ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {isAr ? "فشل الإرسال." : "Failed to send."}
        </p>
      ) : null}
      <div>
        <label className="text-sm font-medium">{isAr ? "الاسم" : "Name"} *</label>
        <input
          name="name"
          required
          value={form.name}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{isAr ? "البريد" : "Email"} *</label>
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{isAr ? "الموضوع" : "Subject"} *</label>
        <select
          name="subject"
          value={form.subject}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        >
          <option value="technical">{isAr ? "مشكلة تقنية" : "Technical issue"}</option>
          <option value="account">{isAr ? "مساعدة في الحساب" : "Account help"}</option>
          <option value="general">{isAr ? "سؤال عام" : "General question"}</option>
          <option value="partnership">{isAr ? "شراكة" : "Partnership"}</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{isAr ? "الرسالة" : "Message"} *</label>
        <textarea
          name="message"
          required
          rows={4}
          value={form.message}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#C9A84C] py-3 text-sm font-semibold text-[#0D1F2D] disabled:opacity-60"
      >
        {isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : isAr ? "إرسال" : "Send"}
      </button>
    </form>
  );
}
