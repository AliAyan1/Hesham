"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const locale = useLocale();
  const t = useTranslations("pages.contact");
  const isRTL = locale === "ar" || locale === "ur";
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 1 &&
      form.email.trim().includes("@") &&
      form.subject.trim().length > 2 &&
      form.message.trim().length > 5
    );
  }, [form]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setStatus("idle");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("bad");
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNavbar locale={locale} />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#6B7280]">{t("subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
          >
            <div className="grid gap-4">
              <Field label={t("name")}>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                />
              </Field>
              <Field label={t("email")}>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                />
              </Field>
              <Field label={t("subject")}>
                <input
                  name="subject"
                  value={form.subject}
                  onChange={onChange}
                  className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                />
              </Field>
              <Field label={t("message")}>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                />
              </Field>
            </div>

            {status !== "idle" ? (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-[#1D9E75]/30 bg-[#E1F5EE] text-[#0D2137]"
                    : "border-red-300 bg-red-50 text-red-700"
                }`}
                role="status"
              >
                {status === "success" ? t("success") : t("error")}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2137] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("sending") : t("send")}
            </button>
          </form>

          <aside className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1D9E75]">
              QUDRAHTECH
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              {t("subtitle")}
            </p>
            <div className="mt-8 space-y-3 text-sm text-[#0D2137]">
              <p className="font-semibold">support@qudrahtech.sa</p>
              <p className="text-[#6B7280]">Riyadh, Saudi Arabia</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#0D2137]">{label}</span>
      {children}
    </label>
  );
}

