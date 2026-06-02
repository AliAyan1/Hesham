"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const SUBJECT_KEYS = [
  "subjectGeneral",
  "subjectSupport",
  "subjectPartnership",
  "subjectEmployer",
  "subjectMentor",
] as const;

function fieldErrorMessage(
  field: keyof ContactFormValues,
  issue: z.ZodIssue,
  t: (key: string) => string,
): string {
  if (field === "message" && issue.code === "too_small") {
    return t("messageMinLength");
  }
  if (field === "name" && issue.code === "too_small") {
    return t("nameMinLength");
  }
  if (field === "email" && (issue.code === "invalid_string" || issue.code === "invalid_type")) {
    return t("emailInvalid");
  }
  return t("validationError");
}

export function ContactForm() {
  const t = useTranslations("pages.contact");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ContactFormValues>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>(
    {},
  );

  const subjectOptions = useMemo(
    () =>
      SUBJECT_KEYS.map((key) => ({
        key,
        label: t(key),
      })),
    [t],
  );

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setStatus("idle");
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Partial<Record<keyof ContactFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field as keyof ContactFormValues]) {
          errors[field as keyof ContactFormValues] = fieldErrorMessage(
            field as keyof ContactFormValues,
            issue,
            t,
          );
        }
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (!res.ok) throw new Error("bad");
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
        setFieldErrors({});
      } catch {
        setStatus("error");
      }
    });
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F5EE] text-3xl motion-safe:animate-[landing-in_600ms_ease-out]"
          aria-hidden
        >
          ✅
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#0D2137]">{t("successTitle")}</h2>
        <p className="mt-2 text-sm text-[#6B7280]">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-8 shadow-lg">
      <div className="grid gap-4">
        <Field label={`${t("name")} *`} error={fieldErrors.name}>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className={inputClass}
          />
        </Field>
        <Field label={`${t("email")} *`} error={fieldErrors.email}>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className={inputClass}
          />
        </Field>
        <Field label={`${t("subject")} *`} error={fieldErrors.subject}>
          <select
            name="subject"
            value={form.subject}
            onChange={onChange}
            required
            className={inputClass}
          >
            <option value="">{t("subjectPlaceholder")}</option>
            {subjectOptions.map((opt) => (
              <option key={opt.key} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${t("message")} *`} error={fieldErrors.message}>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            rows={4}
            minLength={10}
            required
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </div>

      {status === "error" ? (
        <div
          className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {t("error")}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2137] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t("sending") : t("send")}
      </button>
    </form>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#0D2137]">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
