type BasalimPageHeroProps = {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  locale: string;
  heightClass?: string;
};

export function BasalimPageHero({
  titleEn,
  titleAr,
  subtitleEn,
  subtitleAr,
  locale,
  heightClass = "min-h-[60vh]",
}: BasalimPageHeroProps) {
  const isAr = locale === "ar";

  return (
    <section
      className={`flex items-center bg-[#0D1F2D] px-4 py-20 text-white md:px-6 ${heightClass}`}
    >
      <div className="mx-auto w-full max-w-4xl motion-safe:animate-[landing-in_600ms_ease-out]">
        <h1 className="whitespace-pre-line text-3xl font-bold leading-tight md:text-[3.25rem] md:leading-[1.1]">
          {isAr ? titleAr : titleEn}
        </h1>
        {subtitleEn || subtitleAr ? (
          <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            {isAr ? subtitleAr : subtitleEn}
          </p>
        ) : null}
      </div>
    </section>
  );
}
