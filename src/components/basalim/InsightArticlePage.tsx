import { Link } from "@/i18n/navigation";
import { BasalimCta } from "@/components/basalim/BasalimCta";
import type { InsightArticle } from "@/lib/basalim/insights-articles";

type Props = {
  locale: string;
  article: InsightArticle;
  related: InsightArticle[];
};

export function InsightArticlePage({ locale, article, related }: Props) {
  const isAr = locale === "ar";
  const body = isAr ? article.bodyAr : article.bodyEn;

  return (
    <>
      <section className="bg-[#0D1F2D] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-semibold uppercase text-[#C9A84C]">
            {isAr ? article.categoryLabelAr : article.categoryLabelEn}
          </span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">
            {isAr ? article.titleAr : article.titleEn}
          </h1>
          <p className="mt-4 text-sm text-white/70">
            {isAr ? "فريق باسالم كونسلتينج" : "Basalim Consulting Team"} · {article.date} ·{" "}
            {article.readMinutes} {isAr ? "دقائق قراءة" : "min read"}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="space-y-5 text-lg leading-relaxed text-[#374151]">
          {body.map((para) => (
            <p key={para.slice(0, 30)}>{para}</p>
          ))}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-gray-100 bg-[#FAFAF9] px-4 py-14 md:px-6">
          <h2 className="mx-auto max-w-3xl text-xl font-bold text-[#0D1F2D]">
            {isAr ? "مقالات ذات صلة" : "Related articles"}
          </h2>
          <ul className="mx-auto mt-6 grid max-w-3xl gap-4">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/insights/${r.slug}`}
                  className="block rounded-lg border border-gray-100 bg-white p-4 font-semibold text-[#1A6B5A] hover:underline"
                >
                  {isAr ? r.titleAr : r.titleEn}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BasalimCta
        locale={locale}
        titleEn="Need help? Book a consultation"
        titleAr="تحتاج مساعدة؟ احجز استشارة"
        buttonEn="Book a Consultation"
        buttonAr="احجز استشارة"
      />
    </>
  );
}
