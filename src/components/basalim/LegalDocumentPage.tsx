import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";

type Props = {
  locale: string;
  titleEn: string;
  titleAr: string;
  paragraphsEn: string[];
  paragraphsAr: string[];
  updated: string;
};

export function LegalDocumentPage({
  locale,
  titleEn,
  titleAr,
  paragraphsEn,
  paragraphsAr,
  updated,
}: Props) {
  const isAr = locale === "ar";
  const paragraphs = isAr ? paragraphsAr : paragraphsEn;

  return (
    <>
      <BasalimPageHero
        locale={locale}
        titleEn={titleEn}
        titleAr={titleAr}
        heightClass="min-h-[35vh]"
      />
      <article className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <p className="text-sm text-[#6B7280]">
          {isAr ? "آخر تحديث:" : "Last updated:"} {updated}
        </p>
        <div className="prose prose-neutral mt-8 max-w-none space-y-4 text-[#374151]">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </article>
    </>
  );
}
