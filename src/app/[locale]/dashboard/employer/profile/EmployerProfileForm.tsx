"use client";

import { useCallback, useEffect, useState } from "react";
import axios, { isAxiosError } from "axios";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type EmployerForm = {
  companyName: string;
  companyNameAr: string;
  logoUrl: string;
  industry: string;
  companySize: string;
  foundedYear: string;
  websiteUrl: string;
  linkedinUrl: string;
  description: string;
  descriptionAr: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  officeLocation: string;
  crNumber: string;
  twitterUrl: string;
  instagramUrl: string;
  activeHiring: boolean;
};

const emptyForm: EmployerForm = {
  companyName: "",
  companyNameAr: "",
  logoUrl: "",
  industry: "",
  companySize: "",
  foundedYear: "",
  websiteUrl: "",
  linkedinUrl: "",
  description: "",
  descriptionAr: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  officeLocation: "",
  crNumber: "",
  twitterUrl: "",
  instagramUrl: "",
  activeHiring: true,
};

export function EmployerProfileForm() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [form, setForm] = useState<EmployerForm>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await axios.get<{ success: boolean; data: { employerProfile?: Record<string, unknown> } }>(
        "/api/profile/employer",
      );
      const ep = res.data?.data?.employerProfile ?? {};
      setForm({
        companyName: String(ep.companyName ?? ""),
        companyNameAr: String(ep.companyNameAr ?? ""),
        logoUrl: String(ep.logoUrl ?? ""),
        industry: String(ep.industry ?? ""),
        companySize: String(ep.companySize ?? ""),
        foundedYear: ep.foundedYear != null ? String(ep.foundedYear) : "",
        websiteUrl: String(ep.websiteUrl ?? ""),
        linkedinUrl: String(ep.linkedinUrl ?? ""),
        description: String(ep.description ?? ""),
        descriptionAr: String(ep.descriptionAr ?? ""),
        contactName: String(ep.contactName ?? ""),
        contactEmail: String(ep.contactEmail ?? ""),
        contactPhone: String(ep.contactPhone ?? ""),
        officeLocation: String(ep.officeLocation ?? ""),
        crNumber: String(ep.crNumber ?? ""),
        twitterUrl: String(ep.twitterUrl ?? ""),
        instagramUrl: String(ep.instagramUrl ?? ""),
        activeHiring: typeof ep.activeHiring === "boolean" ? ep.activeHiring : true,
      });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const fy = form.foundedYear.trim() ? Number.parseInt(form.foundedYear, 10) : undefined;
      await axios.put("/api/profile/employer", {
        companyName: form.companyName.trim() || undefined,
        companyNameAr: form.companyNameAr.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        industry: form.industry.trim() || undefined,
        companySize: form.companySize.trim() || undefined,
        foundedYear: fy !== undefined && !Number.isNaN(fy) ? fy : null,
        websiteUrl: form.websiteUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        description: form.description.trim() || undefined,
        descriptionAr: form.descriptionAr.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        officeLocation: form.officeLocation.trim() || undefined,
        crNumber: form.crNumber.trim() || undefined,
        twitterUrl: form.twitterUrl.trim() || undefined,
        instagramUrl: form.instagramUrl.trim() || undefined,
        activeHiring: form.activeHiring,
      });
      setMsg(t("saved"));
    } catch (e) {
      const err = isAxiosError(e) ? String(e.response?.data?.error ?? "") : "";
      setMsg(err || tc("error"));
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <LoadingSpinner size="full" label={tc("loading")} />;
  if (status === "error") return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => void load()} />;

  function field(
    label: string,
    key: keyof EmployerForm,
    opts?: { multiline?: boolean; type?: string; readonly?: boolean },
  ) {
    const common =
      "w-full min-h-11 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2";
    return (
      <label className="flex flex-col gap-1 md:col-span-1">
        <span className="text-xs font-semibold text-[#6B7280]">{label}</span>
        {opts?.multiline ? (
          <textarea
            readOnly={opts.readonly}
            value={String(form[key])}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value as never }))}
            rows={4}
            className={common}
          />
        ) : (
          <input
            readOnly={opts?.readonly}
            type={opts?.type ?? "text"}
            value={String(form[key])}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value as never }))}
            className={common}
          />
        )}
      </label>
    );
  }

  return (
    <div className="space-y-8">
      {msg ? (
        <p className={`text-sm ${msg === t("saved") ? "text-brand-teal" : "text-red-600"}`} role="status">
          {msg}
        </p>
      ) : null}
      <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("companyInfo")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field(t("companyNameEn"), "companyName")}
          {field(t("companyNameArLabel"), "companyNameAr")}
          {field(t("logoUrl"), "logoUrl")}
          {field(t("industry"), "industry")}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#6B7280]">{t("companySize")}</span>
            <select
              value={form.companySize}
              onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
              className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
            >
              <option value="">—</option>
              <option value="1-10">1–10</option>
              <option value="11-50">11–50</option>
              <option value="51-200">51–200</option>
              <option value="201-500">201–500</option>
              <option value="500+">500+</option>
            </select>
          </label>
          {field(t("foundedYear"), "foundedYear", { type: "number" })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("companyOverview")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field(t("descriptionEn"), "description", { multiline: true })}
          {field(t("descriptionArLabel"), "descriptionAr", { multiline: true })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("contactSection")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field(t("contactName"), "contactName")}
          {field(t("contactEmail"), "contactEmail", { type: "email" })}
          {field(t("contactPhone"), "contactPhone")}
          {field(t("officeLocation"), "officeLocation")}
          {field(t("crNumber"), "crNumber")}
        </div>
      </section>

      <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("socialSection")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {field(t("website"), "websiteUrl")}
          {field(t("linkedin"), "linkedinUrl")}
          {field(t("twitter"), "twitterUrl")}
          {field(t("instagram"), "instagramUrl")}
          <label className="flex items-center gap-2 pt-8 text-sm font-medium text-[#374151]">
            <input
              type="checkbox"
              checked={form.activeHiring}
              onChange={(e) => setForm((f) => ({ ...f, activeHiring: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand-teal"
            />
            {t("activeHiring")}
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" loading={saving} className="min-h-11 px-8" onClick={() => void save()}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
