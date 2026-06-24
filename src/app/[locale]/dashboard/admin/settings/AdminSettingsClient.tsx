"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlatformSettingsDto } from "@/lib/settings";

type TabId = "general" | "pricing" | "features" | "emails" | "limits" | "maintenance";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "pricing", label: "Pricing" },
  { id: "features", label: "Features" },
  { id: "emails", label: "Emails" },
  { id: "limits", label: "Limits" },
  { id: "maintenance", label: "Maintenance" },
];

export default function AdminSettingsClient() {
  const [settings, setSettings] = useState<PlatformSettingsDto | null>(null);
  const [draft, setDraft] = useState<PlatformSettingsDto | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/settings", { credentials: "include" });
    const json = (await res.json()) as { ok?: boolean; settings?: PlatformSettingsDto; error?: string };
    if (!res.ok || !json.ok || !json.settings) {
      throw new Error(json.error ?? "Failed to load settings");
    }
    setSettings(json.settings);
    setDraft(json.settings);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : "Failed to load settings");
    });
  }, [load]);

  const persist = useCallback(
    async (patch: Partial<PlatformSettingsDto>, options?: { immediate?: boolean }) => {
      if (!draft) return;
      const next = { ...draft, ...patch };
      setDraft(next);

      const run = async () => {
        setSaveStatus("saving");
        try {
          const res = await fetch("/api/admin/settings", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const json = (await res.json()) as {
            ok?: boolean;
            settings?: PlatformSettingsDto;
            error?: string;
          };
          if (!res.ok || !json.ok || !json.settings) {
            throw new Error(json.error ?? "Save failed");
          }
          setSettings(json.settings);
          setDraft(json.settings);
          setSaveStatus("saved");
          setLastSavedAt(new Date());
          window.setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("error");
        }
      };

      if (options?.immediate) {
        await run();
        return;
      }

      const key = Object.keys(patch).join(",");
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        void run();
      }, 1000);
    },
    [draft],
  );

  const updateBoolean = useCallback(
    (field: keyof PlatformSettingsDto, value: boolean) => {
      if (field === "isMaintenanceMode" && value) {
        const ok = window.confirm(
          "Turning ON maintenance mode will show the maintenance page to ALL users except admins. Continue?",
        );
        if (!ok) return;
      }
      void persist({ [field]: value } as Partial<PlatformSettingsDto>);
    },
    [persist],
  );

  const updateField = useCallback(
    <K extends keyof PlatformSettingsDto>(field: K, value: PlatformSettingsDto[K]) => {
      setDraft((current) => (current ? { ...current, [field]: value } : current));
    },
    [],
  );

  const saveFieldOnBlur = useCallback(
    async (field: keyof PlatformSettingsDto) => {
      if (!draft || !settings || draft[field] === settings[field]) return;
      await persist({ [field]: draft[field] } as Partial<PlatformSettingsDto>, { immediate: true });
    },
    [draft, persist, settings],
  );

  const saveSection = useCallback(
    async (fields: (keyof PlatformSettingsDto)[]) => {
      if (!draft || !settings) return;
      const patch: Partial<PlatformSettingsDto> = {};
      for (const field of fields) {
        if (draft[field] !== settings[field]) {
          (patch as Record<keyof PlatformSettingsDto, PlatformSettingsDto[keyof PlatformSettingsDto]>)[field] =
            draft[field];
        }
      }
      if (Object.keys(patch).length === 0) return;
      await persist(patch, { immediate: true });
    },
    [draft, persist, settings],
  );

  const pricingWithVat = useMemo(() => {
    if (!draft) return null;
    const proVat = draft.proPlanPrice * (1 + draft.vatPercentage / 100);
    const premiumVat = draft.premiumPlanPrice * (1 + draft.vatPercentage / 100);
    return { proVat, premiumVat };
  }, [draft]);

  async function clearCache() {
    await fetch("/api/admin/settings/clear-cache", { method: "POST", credentials: "include" });
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  }

  function exportSettings() {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "platform-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm text-[#6B7280]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D2137] md:text-3xl">Platform Settings</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Changes auto-save. Toggles save after 1 second; text and numbers save on blur.
            </p>
            {lastSavedAt ? (
              <p className="mt-1 text-xs text-[#6B7280]">
                Last saved: {lastSavedAt.toLocaleString()}
              </p>
            ) : null}
          </div>
          <SaveBadge status={saveStatus} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[#0F4C75] text-white"
                  : "bg-[#F8FAFC] text-[#0D2137] hover:bg-[#EEF4FF]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "general" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Platform Information"
            onSave={() =>
              void saveSection([
                "platformName",
                "platformNameAr",
                "platformUrl",
                "supportEmail",
              ])
            }
          >
            <TextField
              label="Platform Name (EN)"
              value={draft.platformName}
              onChange={(v) => updateField("platformName", v)}
              onBlur={() => void saveFieldOnBlur("platformName")}
            />
            <TextField
              label="Platform Name (AR)"
              value={draft.platformNameAr}
              onChange={(v) => updateField("platformNameAr", v)}
              onBlur={() => void saveFieldOnBlur("platformNameAr")}
              dir="rtl"
            />
            <TextField
              label="Platform URL"
              value={draft.platformUrl}
              onChange={(v) => updateField("platformUrl", v)}
              onBlur={() => void saveFieldOnBlur("platformUrl")}
            />
            <TextField
              label="Support Email"
              value={draft.supportEmail}
              onChange={(v) => updateField("supportEmail", v)}
              onBlur={() => void saveFieldOnBlur("supportEmail")}
            />
          </SectionCard>

          <SectionCard
            title="Assessment Settings"
            onSave={() =>
              void saveSection([
                "assessmentPassScore",
                "assessmentRetakeLimit",
                "interviewQuestionCount",
              ])
            }
          >
            <NumberField
              label="Minimum Pass Score"
              suffix="out of 100"
              value={draft.assessmentPassScore}
              onChange={(v) => updateField("assessmentPassScore", v)}
              onBlur={() => void saveFieldOnBlur("assessmentPassScore")}
            />
            <NumberField
              label="Max Retake Attempts"
              suffix="times"
              value={draft.assessmentRetakeLimit}
              onChange={(v) => updateField("assessmentRetakeLimit", v)}
              onBlur={() => void saveFieldOnBlur("assessmentRetakeLimit")}
            />
            <NumberField
              label="Interview Questions Count"
              suffix="questions"
              value={draft.interviewQuestionCount}
              onChange={(v) => updateField("interviewQuestionCount", v)}
              onBlur={() => void saveFieldOnBlur("interviewQuestionCount")}
            />
          </SectionCard>

          <SectionCard
            title="Talent Pool Settings"
            onSave={() => void saveSection(["talentPoolMinScore", "talentPoolMinProfile"])}
          >
            <NumberField
              label="Min Score to Exit Pool"
              suffix="out of 100"
              value={draft.talentPoolMinScore}
              onChange={(v) => updateField("talentPoolMinScore", v)}
              onBlur={() => void saveFieldOnBlur("talentPoolMinScore")}
            />
            <NumberField
              label="Min Profile % to Exit Pool"
              suffix="%"
              value={draft.talentPoolMinProfile}
              onChange={(v) => updateField("talentPoolMinProfile", v)}
              onBlur={() => void saveFieldOnBlur("talentPoolMinProfile")}
            />
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "pricing" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Subscription Pricing"
            onSave={() =>
              void saveSection(["proPlanPrice", "premiumPlanPrice", "vatPercentage"])
            }
          >
            <NumberField
              label="Professional Plan Price"
              prefix="SAR"
              suffix="per month"
              value={draft.proPlanPrice}
              onChange={(v) => updateField("proPlanPrice", v)}
              onBlur={() => void saveFieldOnBlur("proPlanPrice")}
            />
            <NumberField
              label="Premium Plan Price"
              prefix="SAR"
              suffix="per month"
              value={draft.premiumPlanPrice}
              onChange={(v) => updateField("premiumPlanPrice", v)}
              onBlur={() => void saveFieldOnBlur("premiumPlanPrice")}
            />
            <NumberField
              label="VAT Percentage"
              suffix="%"
              value={draft.vatPercentage}
              onChange={(v) => updateField("vatPercentage", v)}
              onBlur={() => void saveFieldOnBlur("vatPercentage")}
            />
            {pricingWithVat ? (
              <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#374151]">
                <p>Pro + VAT: SAR {pricingWithVat.proVat.toFixed(2)}/mo</p>
                <p className="mt-1">Premium + VAT: SAR {pricingWithVat.premiumVat.toFixed(2)}/mo</p>
              </div>
            ) : null}
            <WarningBox text="Changing prices will NOT affect existing active subscriptions — only new subscribers." />
          </SectionCard>

          <SectionCard
            title="Mentor Commission"
            onSave={() => void saveSection(["mentorCommission", "mentorPayout"])}
          >
            <NumberField
              label="Platform Commission"
              suffix="% (we keep this)"
              value={draft.mentorCommission}
              onChange={(v) => {
                updateField("mentorCommission", v);
                updateField("mentorPayout", 100 - v);
              }}
              onBlur={() => void saveSection(["mentorCommission", "mentorPayout"])}
            />
            <NumberField
              label="Mentor Payout"
              suffix="% (mentor receives this)"
              value={draft.mentorPayout}
              readOnly
            />
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "features" ? (
        <SectionCard title="Feature Toggles">
          <ToggleRow
            label="Registration Open"
            description="Allow new users to register"
            checked={draft.isRegistrationOpen}
            onChange={(v) => updateBoolean("isRegistrationOpen", v)}
          />
          <ToggleRow
            label="Mentor Marketplace Open"
            description="Allow mentor bookings"
            checked={draft.isMentorMarketOpen}
            onChange={(v) => updateBoolean("isMentorMarketOpen", v)}
          />
          <ToggleRow
            label="Assessment Required"
            description="New users must complete assessment"
            checked={draft.isAssessmentRequired}
            onChange={(v) => updateBoolean("isAssessmentRequired", v)}
          />
          <ToggleRow
            label="Proctoring Enabled"
            description="Anti-cheat system active"
            checked={draft.isProctorEnabled}
            onChange={(v) => updateBoolean("isProctorEnabled", v)}
          />
          <ToggleRow
            label="Maintenance Mode"
            description="Disable platform for all users except admins"
            checked={draft.isMaintenanceMode}
            onChange={(v) => updateBoolean("isMaintenanceMode", v)}
            danger
          />
        </SectionCard>
      ) : null}

      {activeTab === "emails" ? (
        <SectionCard title="Email Notifications">
          <ToggleRow
            label="Welcome Email on Register"
            checked={draft.sendWelcomeEmail}
            onChange={(v) => updateBoolean("sendWelcomeEmail", v)}
          />
          <ToggleRow
            label="Assessment Invite after Register"
            checked={draft.sendAssessmentInvite}
            onChange={(v) => updateBoolean("sendAssessmentInvite", v)}
          />
          <ToggleRow
            label="Assessment Results Email"
            checked={draft.sendAssessmentResults}
            onChange={(v) => updateBoolean("sendAssessmentResults", v)}
          />
          <ToggleRow
            label="Job Match Notifications"
            checked={draft.sendJobMatchEmail}
            onChange={(v) => updateBoolean("sendJobMatchEmail", v)}
          />
          <ToggleRow
            label="Application Status Updates"
            checked={draft.sendApplicationStatus}
            onChange={(v) => updateBoolean("sendApplicationStatus", v)}
          />
          <ToggleRow
            label="Interview Invitations"
            checked={draft.sendInterviewInvite}
            onChange={(v) => updateBoolean("sendInterviewInvite", v)}
          />
          <ToggleRow
            label="Offer Letter Notifications"
            checked={draft.sendOfferLetter}
            onChange={(v) => updateBoolean("sendOfferLetter", v)}
          />
          <ToggleRow
            label="Session Reminders (15 min before)"
            checked={draft.sendSessionReminder}
            onChange={(v) => updateBoolean("sendSessionReminder", v)}
          />
        </SectionCard>
      ) : null}

      {activeTab === "limits" ? (
        <SectionCard
          title="Platform Limits"
          onSave={() =>
            void saveSection(["maxJobsPerEmployer", "maxApplicationsPerJob", "freeUserJobAlerts"])
          }
        >
          <NumberField
            label="Max Jobs per Employer"
            suffix="per month"
            value={draft.maxJobsPerEmployer}
            onChange={(v) => updateField("maxJobsPerEmployer", v)}
            onBlur={() => void saveFieldOnBlur("maxJobsPerEmployer")}
          />
          <NumberField
            label="Max Applications per Job"
            suffix="applications"
            value={draft.maxApplicationsPerJob}
            onChange={(v) => updateField("maxApplicationsPerJob", v)}
            onBlur={() => void saveFieldOnBlur("maxApplicationsPerJob")}
          />
          <NumberField
            label="Free User Job Alerts"
            suffix="per day"
            value={draft.freeUserJobAlerts}
            onChange={(v) => updateField("freeUserJobAlerts", v)}
            onBlur={() => void saveFieldOnBlur("freeUserJobAlerts")}
          />
        </SectionCard>
      ) : null}

      {activeTab === "maintenance" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-900">Danger Zone</h2>
            <p className="mt-2 text-sm text-red-800">
              When maintenance mode is ON, all users see the maintenance page. Only admins can access
              the platform.
            </p>
            <div className="mt-4">
              <ToggleRow
                label="Maintenance Mode"
                description={
                  draft.isMaintenanceMode ? "Platform is in maintenance" : "Platform is online"
                }
                checked={draft.isMaintenanceMode}
                onChange={(v) => updateBoolean("isMaintenanceMode", v)}
                danger
              />
            </div>
            <p className="mt-4 text-sm font-semibold text-red-900">
              Status: {draft.isMaintenanceMode ? "🔴 Maintenance Mode" : "🟢 Platform Online"}
            </p>
          </section>

          <SectionCard
            title="Maintenance Message"
            onSave={() => void saveSection(["maintenanceMessage", "maintenanceMessageAr"])}
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#0D2137]">English</span>
              <textarea
                rows={3}
                value={draft.maintenanceMessage}
                onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                onBlur={() => void saveFieldOnBlur("maintenanceMessage")}
                className="w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#0D2137]">Arabic</span>
              <textarea
                dir="rtl"
                rows={3}
                value={draft.maintenanceMessageAr}
                onChange={(e) => updateField("maintenanceMessageAr", e.target.value)}
                onBlur={() => void saveFieldOnBlur("maintenanceMessageAr")}
                className="w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-right text-sm"
              />
            </label>
          </SectionCard>

          <SectionCard title="Tools">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void clearCache()}
                className="rounded-xl border border-[#0F4C75] px-4 py-2 text-sm font-semibold text-[#0F4C75]"
              >
                Clear all cached data
              </button>
              <button
                type="button"
                onClick={exportSettings}
                className="rounded-xl bg-[#0F4C75] px-4 py-2 text-sm font-semibold text-white"
              >
                Export settings JSON
              </button>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#0F4C75]">
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        All changes saved ✅
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
        Error saving
      </span>
    );
  }
  return null;
}

function SectionCard({
  title,
  children,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#0D2137]">{title}</h2>
        {onSave ? (
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg border border-[#0F4C75] px-3 py-1.5 text-xs font-semibold text-[#0F4C75]"
          >
            Save section
          </button>
        ) : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  danger,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
        danger ? "border-red-200 bg-red-50/50" : "border-[#EEF2F7] bg-[#F8FAFC]"
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-[#0D2137]">
          {checked ? "🟢" : "⚪"} {label}
        </p>
        {description ? <p className="mt-1 text-xs text-[#6B7280]">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          checked ? "bg-[#1D9E75]" : "bg-[#D1D5DB]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#0D2137]">{label}</span>
      <input
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-11 w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  onBlur,
  prefix,
  suffix,
  readOnly,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  onBlur?: () => void;
  prefix?: string;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#0D2137]">{label}</span>
      <div className="flex items-center gap-2">
        {prefix ? <span className="text-sm text-[#6B7280]">{prefix}</span> : null}
        <input
          type="number"
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          onBlur={onBlur}
          className="min-h-11 w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm"
        />
        {suffix ? <span className="text-sm text-[#6B7280]">{suffix}</span> : null}
      </div>
    </label>
  );
}

function WarningBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      ⚠️ {text}
    </div>
  );
}
