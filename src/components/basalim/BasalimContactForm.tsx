"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(40).optional(),
  industry: z.string().trim().min(1).max(80),
  service: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(4000),
});

type FormValues = z.infer<typeof schema>;

type BasalimContactFormProps = {
  locale: string;
};

export function BasalimContactForm({ locale }: BasalimContactFormProps) {
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [form, setForm] = useState<FormValues>({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "hospitality",
    service: "od",
    message: "",
  });

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
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
    const subject = `${d.company} | ${d.industry} | ${d.service}`;
    const message = [
      d.message,
      "",
      `Company: ${d.company}`,
      `Industry: ${d.industry}`,
      `Service: ${d.service}`,
      d.phone ? `Phone: ${d.phone}` : null,
    ]
      .filter(Boolean)
      .join("\n");

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
      <div className="rounded-2xl border border-[#1A6B5A]/30 bg-[#1A6B5A]/5 p-10 text-center">
        <p className="text-lg font-semibold text-[#0D1F2D]">
          {isAr
            ? "تم الإرسال بنجاح! سنتواصل معك خلال 24 ساعة."
            : "Message sent successfully! We'll be in touch within 24 hours."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-8 shadow-lg">
      {status === "error" ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {isAr
            ? "تعذر الإرسال. يرجى مراسلتنا عبر البريد مباشرة."
            : "Failed to send. Please email us directly."}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "الاسم الكامل *" : "Full Name *"}
          <input
            name="name"
            required
            value={form.name}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "اسم الشركة *" : "Company Name *"}
          <input
            name="company"
            required
            value={form.company}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "البريد الإلكتروني *" : "Work Email *"}
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "رقم الهاتف" : "Phone Number"}
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "القطاع" : "Industry"}
          <select
            name="industry"
            value={form.industry}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          >
            <option value="hospitality">{isAr ? "الضيافة" : "Hospitality"}</option>
            <option value="real-estate">{isAr ? "العقارات" : "Real Estate"}</option>
            <option value="healthcare">{isAr ? "الرعاية الصحية" : "Healthcare"}</option>
            <option value="startup">{isAr ? "ناشئة" : "Startup"}</option>
            <option value="government">{isAr ? "حكومي" : "Government"}</option>
            <option value="other">{isAr ? "أخرى" : "Other"}</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-[#374151]">
          {isAr ? "الخدمة المطلوبة" : "Service Needed"}
          <select
            name="service"
            value={form.service}
            onChange={onChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
          >
            <option value="od">{isAr ? "التطوير التنظيمي" : "OD"}</option>
            <option value="recruitment">{isAr ? "التوظيف" : "Recruitment"}</option>
            <option value="ld">{isAr ? "التعلم والتطوير" : "L&D"}</option>
            <option value="leadership">{isAr ? "القيادة" : "Leadership"}</option>
            <option value="hospitality">{isAr ? "الضيافة" : "Hospitality"}</option>
            <option value="people-function">{isAr ? "وظيفة الموارد البشرية" : "People Function"}</option>
            <option value="advisory">{isAr ? "استشارات" : "Advisory"}</option>
            <option value="other">{isAr ? "أخرى" : "Other"}</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-[#374151]">
        {isAr ? "الرسالة" : "Message"}
        <textarea
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={onChange}
          placeholder={
            isAr
              ? "أخبرنا عن منظمتك وكيف يمكننا مساعدتك"
              : "Tell us about your organization and how we can help"
          }
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-lg bg-[#1A6B5A] py-3.5 text-sm font-semibold text-white hover:bg-[#155A4A] disabled:opacity-60"
      >
        {isPending
          ? isAr
            ? "جاري الإرسال..."
            : "Sending..."
          : isAr
            ? "إرسال الرسالة"
            : "Send Message"}
      </button>
    </form>
  );
}
