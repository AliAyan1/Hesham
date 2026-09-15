type QudratakInnerHeroProps = {
  locale: string;
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
};

export function QudratakInnerHero({
  locale,
  titleEn,
  titleAr,
  subtitleEn,
  subtitleAr,
}: QudratakInnerHeroProps) {
  const isAr = locale === "ar";
  return (
    <section className="bg-[#0D1F2D] px-4 py-16 text-white md:px-6 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold leading-tight md:text-[2.75rem]">
          {isAr ? titleAr : titleEn}
        </h1>
        {subtitleEn || subtitleAr ? (
          <p className="mt-6 max-w-3xl text-lg text-white/80">{isAr ? subtitleAr : subtitleEn}</p>
        ) : null}
      </div>
    </section>
  );
}
