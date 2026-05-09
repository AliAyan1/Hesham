import { getTranslations } from "next-intl/server";

function ScoreBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm font-medium text-white">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-white/80">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.12]">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export async function TrustedAssessmentsSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const isRTL = locale === "ar" || locale === "ur";

  const pills = [
    { emoji: "🖥️", titleKey: "trustPill1Title", descKey: "trustPill1Desc" as const },
    { emoji: "👁️", titleKey: "trustPill2Title", descKey: "trustPill2Desc" as const },
    { emoji: "🚫", titleKey: "trustPill3Title", descKey: "trustPill3Desc" as const },
    { emoji: "🤖", titleKey: "trustPill4Title", descKey: "trustPill4Desc" as const },
  ] as const;

  const scoreDimensions = [
    { labelKey: "trustDimSkills", pct: 88, color: "#1D9E75" },
    { labelKey: "trustDimComm", pct: 79, color: "#38BDF8" },
    { labelKey: "trustDimBehav", pct: 91, color: "#22C55E" },
    { labelKey: "trustDimIndustry", pct: 76, color: "#C9973A" },
  ] as const;

  return (
    <section
      className="bg-[#0D2137]"
      aria-labelledby="trust-assessments-heading"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ padding: "72px 32px" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">{t("trustEyebrow")}</p>
            <h2 id="trust-assessments-heading" className="mt-4 text-white">
              <span className="block max-w-xl text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{t("trustHeading")}</span>
              <span className="mt-4 block max-w-xl text-[36px] font-extrabold leading-[1.15] tracking-tight">
                {t("trustTitleLine")}
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.6)]">{t("trustSubtitle")}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {pills.map((p) => (
                <div key={p.titleKey} className="rounded-xl bg-[rgba(255,255,255,0.07)] p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-white">
                    <span aria-hidden>{p.emoji}</span>
                    <span>{t(p.titleKey)}</span>
                  </p>
                  <p className="mt-2 text-xs leading-snug text-white/65">{t(p.descKey)}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 text-sm italic text-[rgba(255,255,255,0.4)]">{t("trustFlagsNote")}</p>
          </div>

          <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-6 lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1D9E75]">{t("trustReportLabel")}</p>

            <div className={`mt-4 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white"
                aria-hidden
              >
                {t("trustCandidateInitials")}
              </span>
              <div className={`min-w-0 ${isRTL ? "text-end" : ""}`}>
                <p className="truncate font-semibold text-white">{t("trustCandidateName")}</p>
              </div>
            </div>

            <p className={`mt-6 text-3xl font-extrabold tabular-nums text-white ${isRTL ? "text-start" : ""}`}>
              {t("trustOverallLead")}
            </p>

            <div className="mt-6 grid gap-5">
              {scoreDimensions.map((row) => (
                <ScoreBar key={row.labelKey} label={t(row.labelKey)} pct={row.pct} color={row.color} />
              ))}
            </div>

            <div className={`mt-8 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 ${isRTL ? "text-start" : ""}`}>
              {t("trustVerifiedBadge")}
            </div>

            <p className={`mt-4 text-[11px] leading-relaxed text-[rgba(255,255,255,0.3)] ${isRTL ? "text-start" : ""}`}>
              {t("trustSessionMeta")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
