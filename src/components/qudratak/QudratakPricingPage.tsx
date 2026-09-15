import { Check, X } from "lucide-react";
import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { PlatformButton } from "@/components/qudratak/PlatformCta";
import { QUDRATAK_PRICING, type PricingPlanId } from "@/lib/basalim/qudratak-data";
import { QudrahtechRegisterUrl } from "@/lib/basalim-public";
import { cn } from "@/lib/cn";

type Props = { locale: string };

function registerUrlForPlan(locale: string, id: PricingPlanId): string {
  if (id === "mentor") return QudrahtechRegisterUrl(locale, { role: "mentor" });
  if (id === "free") return QudrahtechRegisterUrl(locale, { plan: "free" });
  return QudrahtechRegisterUrl(locale, { plan: id });
}

export function QudratakPricingPage({ locale }: Props) {
  const isAr = locale === "ar";

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="Choose the Right Plan for You."
        titleAr="اختر الباقة المناسبة لك"
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2 lg:grid-cols-4 md:px-6">
        {QUDRATAK_PRICING.map((plan) => {
          const href = registerUrlForPlan(locale, plan.id);
          const features = isAr ? plan.featuresAr : plan.featuresEn;
          const excluded = isAr ? plan.excludedAr : plan.excludedEn;

          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-6 shadow-sm",
                plan.featured && "border-[#1A6B5A] ring-2 ring-[#1A6B5A]/30",
                plan.premiumStyle && "border-[#C9A84C] ring-2 ring-[#C9A84C]/40",
                plan.mentorStyle && "border-[#C9A84C] bg-[#0D1F2D] text-white",
                !plan.mentorStyle && "bg-white",
              )}
            >
              {plan.featured ? (
                <span className="mb-2 w-fit rounded-full bg-[#1A6B5A] px-2 py-0.5 text-xs font-semibold text-white">
                  {isAr ? "الأكثر شعبية" : "Popular"}
                </span>
              ) : null}
              <h3 className="text-lg font-bold">{isAr ? plan.nameAr : plan.nameEn}</h3>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold",
                  plan.mentorStyle ? "text-[#C9A84C]" : "text-[#0D1F2D]",
                )}
              >
                {isAr ? plan.priceAr : plan.priceEn}
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-[#1A6B5A]" aria-hidden />
                    <span className={plan.mentorStyle ? "text-white/90" : "text-[#374151]"}>
                      {f}
                    </span>
                  </li>
                ))}
                {excluded?.map((f) => (
                  <li key={f} className="flex gap-2 opacity-60">
                    <X className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <PlatformButton
                href={href}
                variant={plan.mentorStyle ? "gold" : "gold"}
                className={cn("mt-8 w-full", plan.mentorStyle && "bg-[#C9A84C]")}
              >
                {isAr ? plan.ctaAr : plan.ctaEn}
              </PlatformButton>
            </div>
          );
        })}
      </section>
    </>
  );
}
