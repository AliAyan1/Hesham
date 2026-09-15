type Stat = { valueEn: string; labelEn: string; labelAr: string };

const DEFAULT_STATS: Stat[] = [
  { valueEn: "2,000+", labelEn: "Professionals trained", labelAr: "محترف تم تدريبه وتوظيفه" },
  { valueEn: "100+", labelEn: "Projects delivered", labelAr: "مشروع منجز" },
  { valueEn: "52%", labelEn: "Placement rate", labelAr: "نسبة توظيف المواهب" },
  { valueEn: "4", labelEn: "Core service areas", labelAr: "مجالات خدمة رئيسية" },
];

type BasalimStatsRowProps = {
  locale: string;
  stats?: Stat[];
  dark?: boolean;
};

export function BasalimStatsRow({ locale, stats = DEFAULT_STATS, dark = false }: BasalimStatsRowProps) {
  const isAr = locale === "ar";

  return (
    <section className={dark ? "bg-[#0D1F2D] py-12 text-white" : "border-y border-gray-100 bg-[#F5F3EE] py-12"}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6">
        {stats.map((s) => (
          <div key={s.labelEn} className="text-center md:text-start">
            <p className={`text-3xl font-bold ${dark ? "text-[#C9A84C]" : "text-[#1A6B5A]"}`}>{s.valueEn}</p>
            <p className={`mt-1 text-sm ${dark ? "text-white/70" : "text-[#6B7280]"}`}>
              {isAr ? s.labelAr : s.labelEn}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
