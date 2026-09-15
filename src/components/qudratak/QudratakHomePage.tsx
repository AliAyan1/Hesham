import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlatformButton } from "@/components/qudratak/PlatformCta";
import {
  QUDRATAK_FEATURES,
  QUDRATAK_JOURNEY,
} from "@/lib/basalim/qudratak-data";
import { QudrahtechRegisterUrl } from "@/lib/basalim-public";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1920&q=80";

type Props = { locale: string };

export function QudratakHomePage({ locale }: Props) {
  const isAr = locale === "ar";
  const registerUrl = QudrahtechRegisterUrl(locale, { plan: "free" });
  const StepArrow = isAr ? ChevronLeft : ChevronRight;

  const stats = [
    { value: "+1,500", labelEn: "Young professionals", labelAr: "شاب مستفيد" },
    { value: "+200", labelEn: "Opportunities", labelAr: "فرصة متاحة" },
  ];

  return (
    <>
      <section className="relative flex min-h-[max(560px,calc(100dvh-4.5rem))] items-center overflow-hidden text-white">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <p className="text-[13px] font-semibold tracking-wide text-[#C9A84C]">
            {isAr ? "مبادرة من باسالم كونسلتينج" : "An Initiative by Basalim Consulting"}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-[4rem] md:leading-[1.05]">
            {isAr ? "قدرتك أكبر مما تتوقع" : "Your Potential Is Greater Than You Think."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/90 md:text-xl">
            {isAr
              ? "اكتشف، طوّر مهاراتك، تواصل مع المرشدين، واحصل على الفرص"
              : "Discover your strengths. Develop your skills. Connect with mentors. Find your opportunity."}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <PlatformButton href={registerUrl} variant="gold">
              {isAr ? "ابدأ من هنا" : "Get Started"}
            </PlatformButton>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-md border-2 border-white px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "كيف تعمل" : "How It Works"}
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-md border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white/95 transition-opacity hover:opacity-90"
            >
              {isAr ? "الباقات والأسعار" : "See Plans"}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-white py-12">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-12 px-4 md:px-6">
          {stats.map((s) => (
            <div key={s.value} className="text-center">
              <p className="text-3xl font-bold text-[#1A6B5A] md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[#6B7280]">{isAr ? s.labelAr : s.labelEn}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-white px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-[#0D1F2D] md:text-4xl">
            {isAr ? "رحلتك المهنية في مكان واحد" : "Your Career Journey. All in One Place."}
          </h2>
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl gap-4 overflow-x-auto pb-4 md:px-2">
          {QUDRATAK_JOURNEY.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.titleEn} className="flex shrink-0 items-center gap-2">
                <div className="flex w-[168px] flex-col items-center rounded-xl border border-gray-100 bg-[#F5F3EE]/50 p-5 text-center shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A6B5A]/10">
                    <Icon className="h-6 w-6 text-[#1A6B5A]" aria-hidden />
                  </div>
                  <p className="mt-3 font-bold text-[#0D1F2D]">
                    {isAr ? step.titleAr : step.titleEn}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                    {isAr ? step.descAr : step.descEn}
                  </p>
                </div>
                {i < QUDRATAK_JOURNEY.length - 1 ? (
                  <StepArrow className="hidden h-5 w-5 shrink-0 text-[#C9A84C] md:block" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <PlatformButton href={registerUrl} variant="gold" className="px-8 py-3.5">
            {isAr ? "ابدأ رحلتك" : "Start Your Journey"}
          </PlatformButton>
        </div>
      </section>

      <section className="bg-[#F5F3EE] px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-[#0D1F2D] md:text-4xl">
            {isAr ? "كل ما تحتاجه في مكان واحد" : "Everything You Need in One Place."}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {QUDRATAK_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.titleEn} className="rounded-xl bg-white p-8 shadow-sm">
                  <Icon className="h-8 w-8 text-[#1A6B5A]" aria-hidden />
                  <h3 className="mt-4 text-lg font-bold text-[#0D1F2D]">
                    {isAr ? f.titleAr : f.titleEn}
                  </h3>
                  <p className="mt-2 text-sm text-[#6B7280]">{isAr ? f.descAr : f.descEn}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
