import {
  Building2,
  Hotel,
  Landmark,
  Rocket,
  Stethoscope,
  Users,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import { INDUSTRY_CARDS } from "@/lib/basalim/industries-data";

const ICONS = {
  hotel: Hotel,
  building: Building2,
  health: Stethoscope,
  rocket: Rocket,
  landmark: Landmark,
  users: Users,
} as const;

type Props = { locale: string };

export function IndustriesOverviewPage({ locale }: Props) {
  const isAr = locale === "ar";

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={"Different Industries.\nA Common Belief.\nPeople Make the Difference."}
        titleAr={"القطاعات التي نخدمها —\nخبرة متنوعة حلول مخصصة لكل قطاع"}
        subtitleEn="We bring specialized people and talent expertise across key sectors in Saudi Arabia."
        subtitleAr="نقدم خبرة متخصصة في الموارد البشرية والمواهب عبر القطاعات الرئيسية في المملكة"
      />

      <section className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_CARDS.map((card) => {
            const Icon = ICONS[card.icon as keyof typeof ICONS] ?? Building2;
            const featured = card.featured;
            return (
              <Link
                key={card.slug}
                href={`/industries/${card.slug}`}
                className={[
                  "group rounded-2xl border p-8 transition-shadow hover:shadow-lg",
                  featured
                    ? "border-[#1A6B5A] bg-[#1A6B5A] text-white"
                    : "border-gray-100 bg-white text-[#0D1F2D]",
                ].join(" ")}
              >
                <Icon
                  className={featured ? "h-10 w-10 text-[#C9A84C]" : "h-10 w-10 text-[#1A6B5A]"}
                  aria-hidden
                />
                <h2 className="mt-4 text-xl font-bold">{isAr ? card.titleAr : card.titleEn}</h2>
                <p className={featured ? "mt-2 text-white/85" : "mt-2 text-[#6B7280]"}>
                  {isAr ? card.descAr : card.descEn}
                </p>
                <span
                  className={[
                    "mt-4 inline-flex items-center gap-1 text-sm font-semibold",
                    featured ? "text-[#C9A84C]" : "text-[#1A6B5A]",
                  ].join(" ")}
                >
                  {isAr ? "اعرف المزيد ←" : "Learn more →"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn={"Don't see your industry?\nWe work across all sectors."}
        titleAr={"قطاعك غير مذكور؟\nنعمل في جميع القطاعات"}
        buttonEn="Talk to Our Team"
        buttonAr="تحدث مع فريقنا"
      />
    </>
  );
}
