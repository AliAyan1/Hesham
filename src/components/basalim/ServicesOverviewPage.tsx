import {
  BookOpen,
  Briefcase,
  Building2,
  Crown,
  Hotel,
  Layers,
  Search,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import { SERVICES_OVERVIEW_CARDS } from "@/lib/basalim/services-data";

const ICONS = {
  building: Building2,
  search: Search,
  book: BookOpen,
  crown: Crown,
  hotel: Hotel,
  layers: Layers,
  briefcase: Briefcase,
} as const;

type ServicesOverviewPageProps = { locale: string };

export function ServicesOverviewPage({ locale }: ServicesOverviewPageProps) {
  const isAr = locale === "ar";

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn="From Strategy to Real Impact."
        titleAr="خدماتنا — حلول متكاملة لبناء الفرد والمنظمات"
        subtitleEn="End-to-end people, talent and organization consulting for businesses ready to grow."
        subtitleAr="استشارات متكاملة في الموارد البشرية والمواهب والتطوير التنظيمي"
      />

      <section className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          {SERVICES_OVERVIEW_CARDS.map((card) => {
            const Icon = ICONS[card.icon as keyof typeof ICONS] ?? Building2;
            return (
              <article
                key={card.slug}
                className="rounded-2xl border border-gray-100 p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <Icon className="h-10 w-10 text-[#1A6B5A]" aria-hidden />
                <h2 className="mt-4 text-xl font-bold text-[#0D1F2D]">
                  {isAr ? card.hero.ar : card.hero.en}
                </h2>
                <p className="mt-2 text-[#6B7280]">
                  {isAr ? card.hero.subtitleAr : card.hero.subtitleEn}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-[#374151]">
                  {card.bullets.map((b) => (
                    <li key={b.en} className="flex gap-2">
                      <span className="text-[#1A6B5A]" aria-hidden>
                        •
                      </span>
                      {isAr ? b.ar : b.en}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/services/${card.slug}`}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#1A6B5A] hover:underline"
                >
                  {isAr ? "استكشف الخدمة ←" : "Explore Service →"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <BasalimCta
        locale={locale}
        titleEn="Not sure which service fits?"
        titleAr="غير متأكد من الخدمة المناسبة؟"
        subtitleEn="Book a consultation and we'll help you find the right solution."
        subtitleAr="احجز استشارة وسنساعدك في اختيار الحل المناسب"
        buttonEn="Book a Free Consultation"
        buttonAr="احجز استشارة مجانية"
      />
    </>
  );
}
