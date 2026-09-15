"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

const schema = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  partnershipType: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(4000),
});

type FormValues = z.infer<typeof schema>;

type Props = { locale: string };

export function QudratakPartnershipForm({ locale }: Props) {
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [form, setForm] = useState<FormValues>({
    company: "",
    name: "",
    email: "",
    partnershipType: "cohort",
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
    const subject = `Qudratak Partnership | ${d.company} | ${d.partnershipType}`;
    const message = [
      d.message,
      "",
      `Company: ${d.company}`,
      `Partnership type: ${d.partnershipType}`,
    ].join("\n");

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
        {isAr ? "تم الإرسال بنجاح! سنتواصل معك قريباً." : "Message sent! We will be in touch soon."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-8 shadow-lg">
      {status === "error" ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {isAr ? "فشل الإرسال. راسلنا على البريد مباشرة." : "Failed to send. Please email us directly."}
        </p>
      ) : null}
      <div>
        <label className="text-sm font-medium">{isAr ? "اسم الشركة" : "Company"} *</label>
        <input
          name="company"
          required
          value={form.company}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>
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
        <label className="text-sm font-medium">{isAr ? "نوع الشراكة" : "Partnership type"} *</label>
        <select
          name="partnershipType"
          value={form.partnershipType}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
        >
          <option value="cohort">{isAr ? "رعاية مجموعة مواهب" : "Sponsor a talent cohort"}</option>
          <option value="talent">{isAr ? "مواهب مُقيّمة" : "Pre-assessed talent"}</option>
          <option value="csr">{isAr ? "CSR وأثر اجتماعي" : "CSR & social impact"}</option>
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
        className="w-full rounded-md bg-[#1A6B5A] py-3 text-sm font-semibold text-white hover:bg-[#155A4A] disabled:opacity-60"
      >
        {isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : isAr ? "إرسال" : "Submit"}
      </button>
    </form>
  );
}
