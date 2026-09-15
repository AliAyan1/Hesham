import {
  Brain,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  QUDRAH_PLATFORM_NAME,
  QUDRAH_PLATFORM_NAME_AR,
  QudrahtechJoinUrl,
} from "@/lib/basalim-public";
import { cn } from "@/lib/cn";

type QudrahtechHomeSplitSectionProps = {
  locale: string;
};

type FeatureRow = {
  Icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
};

const FEATURES: FeatureRow[] = [
  {
    Icon: Brain,
    titleEn: "Scientific assessment",
    titleAr: "تقييم نفسي علمي",
    subtitleEn: "ProfileXT-style psychometric evaluation across 19 traits",
    subtitleAr: "تقييم مبني على منهجية بروفايل إكس تي",
  },
  {
    Icon: Video,
    titleEn: "AI video interviews",
    titleAr: "مقابلات فيديو بالذكاء الاصطناعي",
    subtitleEn: "Lara conducts interviews in 6 languages",
    subtitleAr: "لارا تجري المقابلات بـ 6 لغات",
  },
  {
    Icon: Users,
    titleEn: "Mentor marketplace",
    titleAr: "سوق المرشدين المهنيين",
    subtitleEn: "Connect with certified career mentors",
    subtitleAr: "تواصل مع مرشدين مهنيين معتمدين",
  },
  {
    Icon: Briefcase,
    titleEn: "Smart job matching",
    titleAr: "مطابقة وظيفية ذكية",
    subtitleEn: "AI matches you to the right roles automatically",
    subtitleAr: "الذكاء الاصطناعي يطابقك مع الأدوار المناسبة",
  },
];

export function QudrahtechHomeSplitSection({ locale }: QudrahtechHomeSplitSectionProps) {
  const isAr = locale === "ar";
  const joinUrl = QudrahtechJoinUrl(locale);

  const journey = isAr
    ? ["اكتشف", "قيّم", "طور", "تعلّم", "أرشد", "استعد", "طابق", "احصل على الفرصة"]
    : ["Discover", "Assess", "Develop", "Learn", "Mentor", "Prepare", "Match", "Get Hired"];

  const StepArrow = isAr ? ChevronLeft : ChevronRight;

  return (
    <section className="px-4 py-20 md:px-6 md:py-[80px]">
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col overflow-hidden rounded-2xl",
          "min-[769px]:flex-row",
          isAr && "min-[769px]:flex-row-reverse",
        )}
      >
        {/* Left — dark teal (60% on desktop) */}
        <div
          className={cn(
            "bg-[#0D3D2E] px-10 py-12 text-white min-[769px]:w-[60%]",
            isAr ? "text-right" : "text-left",
          )}
        >
          <span className="inline-block rounded-[20px] bg-[rgba(201,168,76,0.2)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[2px] text-[#C9A84C]">
            {isAr ? "مبادرة من باسالم كونسلتينج" : "An Initiative by Basalim Consulting"}
          </span>

          <h2 className="mt-4 text-[36px] font-bold leading-[1.2] text-white">
            {isAr ? (
              "اكتشف قدرتك"
            ) : (
              <>
                Discover
                <br />
                {QUDRAH_PLATFORM_NAME}
              </>
            )}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-[1.7] text-white/65">
            {isAr
              ? "اكتشف إمكاناتك. طوّر قدراتك. وصل إلى الفرصة المناسبة"
              : "Discover your potential. Build your capability. Move closer to the right opportunity."}
          </p>

          <div
            className={cn(
              "mt-6 flex gap-2 overflow-x-auto pb-2 min-[640px]:flex-wrap min-[640px]:overflow-visible",
              isAr ? "flex-row-reverse justify-end" : "",
            )}
          >
            {journey.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "flex shrink-0 items-start gap-1",
                  isAr ? "flex-row-reverse" : "",
                )}
              >
                <div className="flex w-[4.5rem] flex-col items-center sm:w-[5rem]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold text-white">
                    {i + 1}
                  </div>
                  <span className="mt-1.5 text-center text-[10px] leading-snug text-white/70">
                    {step}
                  </span>
                </div>
                {i < journey.length - 1 ? (
                  <StepArrow
                    className="mt-2.5 h-3 w-3 shrink-0 text-white/30 max-[639px]:hidden"
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div
            className={cn(
              "mt-7 flex flex-wrap gap-3",
              isAr ? "justify-end" : "justify-start",
            )}
          >
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0D1F2D] transition-opacity hover:opacity-90"
            >
              {isAr
                ? `انضم إلى ${QUDRAH_PLATFORM_NAME_AR} ←`
                : `Join ${QUDRAH_PLATFORM_NAME} →`}
            </a>
            <a
              href="#qudrahtech-features"
              className="inline-flex items-center rounded-lg border-[1.5px] border-white/30 bg-transparent px-6 py-3 text-sm text-white transition-colors hover:border-white/50 hover:bg-white/5"
            >
              {isAr ? "تعرف على المزيد" : "Learn more"}
            </a>
          </div>
        </div>

        {/* Right — cream (40% on desktop) */}
        <div
          id="qudrahtech-features"
          className={cn(
            "bg-[#F5F3EE] px-9 py-12 min-[769px]:w-[40%]",
            isAr ? "text-right" : "text-left",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1A6B5A]">
            {isAr ? "لماذا قدرتك؟" : `Why ${QUDRAH_PLATFORM_NAME}?`}
          </p>

          <ul className="mt-5 flex flex-col gap-5">
            {FEATURES.map(({ Icon, titleEn, titleAr, subtitleEn, subtitleAr }) => (
              <li
                key={titleEn}
                className={cn(
                  "flex gap-3.5",
                  isAr ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A6B5A]"
                  aria-hidden
                >
                  <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#0D1F2D]">
                    {isAr ? titleAr : titleEn}
                  </p>
                  <p className="mt-0.5 text-xs leading-[1.5] text-[#6B7280]">
                    {isAr ? subtitleAr : subtitleEn}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
