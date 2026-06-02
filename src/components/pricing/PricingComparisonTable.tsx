import { getTranslations } from "next-intl/server";

type PlanKey = "free" | "pro" | "premium";

type Row = {
  feature: string;
  free: boolean;
  pro: boolean;
  premium: boolean;
};

export async function PricingComparisonTable({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "pages.pricing" });

  const rows: Row[] = [
    { feature: t("compare.profileCv"), free: true, pro: true, premium: true },
    { feature: t("compare.browseJobs"), free: true, pro: true, premium: true },
    { feature: t("compare.aiAssessment"), free: true, pro: true, premium: true },
    { feature: t("compare.aiCvParsing"), free: false, pro: true, premium: true },
    { feature: t("compare.atsScoring"), free: false, pro: true, premium: true },
    { feature: t("compare.aiVideoInterview"), free: false, pro: true, premium: true },
    { feature: t("compare.jobMatching"), free: false, pro: true, premium: true },
    { feature: t("compare.hrConsultations"), free: false, pro: false, premium: true },
    { feature: t("compare.mentorSessions"), free: false, pro: false, premium: true },
    { feature: t("compare.prioritySupport"), free: false, pro: false, premium: true },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl shadow-lg">
      <table className="min-w-[720px] w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
        <thead>
          <tr className="bg-[#0F4C75] text-white">
            <th className="px-4 py-4 text-start text-sm font-semibold">{t("compare.featureCol")}</th>
            <th className="px-4 py-4 text-center text-sm font-semibold">{t("compare.freeCol")}</th>
            <th className="px-4 py-4 text-center text-sm font-semibold">{t("compare.proCol")}</th>
            <th className="px-4 py-4 text-center text-sm font-semibold">{t("compare.premiumCol")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.feature} className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
              <td className="px-4 py-4 text-sm font-medium text-[#0D2137]">{row.feature}</td>
              {(["free", "pro", "premium"] as PlanKey[]).map((plan) => (
                <td key={plan} className="px-4 py-4 text-center">
                  <CellIcon included={row[plan]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellIcon({ included }: { included: boolean }) {
  if (included) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E1F5EE] text-sm text-[#1D9E75]"
        aria-label="Included"
      >
        ✅
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-400"
      aria-label="Not included"
    >
      ❌
    </span>
  );
}
