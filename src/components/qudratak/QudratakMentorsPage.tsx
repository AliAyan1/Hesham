import { Star, UserRound } from "lucide-react";
import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { PlatformButton } from "@/components/qudratak/PlatformCta";
import { QUDRATAK_MENTORS } from "@/lib/basalim/qudratak-data";
import { QudrahtechRegisterUrl } from "@/lib/basalim-public";

type Props = { locale: string };

export function QudratakMentorsPage({ locale }: Props) {
  const isAr = locale === "ar";
  const platformRegister = QudrahtechRegisterUrl(locale, { plan: "free" });
  const mentorApply = QudrahtechRegisterUrl(locale, { role: "mentor" });

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="Learn from Someone Who's Been There."
        titleAr="أسأل شخص سبقك"
        subtitleEn="Connect with approved mentors and experts in your field."
        subtitleAr="رحلتك المهنية في مكان واحد — تواصل مع مرشدين متميزين في مجالك وتعلم منهم"
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3 md:px-6">
        {QUDRATAK_MENTORS.map((m) => (
          <article
            key={m.nameEn}
            className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F3EE]">
              <UserRound className="h-8 w-8 text-[#6B7280]" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-bold">{isAr ? m.nameAr : m.nameEn}</h3>
            <p className="text-sm font-medium text-[#1A6B5A]">{isAr ? m.titleAr : m.titleEn}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{isAr ? m.expertiseAr : m.expertiseEn}</p>
            <div className="mt-3 flex items-center gap-1 text-[#C9A84C]" aria-label={`${m.rating} stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(m.rating) ? "fill-current" : "opacity-30"}`}
                  aria-hidden
                />
              ))}
            </div>
            <PlatformButton
              href={platformRegister}
              variant="gold"
              className="mt-auto w-full pt-6 text-center"
            >
              {isAr ? "احجز جلسة ←" : "Book a Session →"}
            </PlatformButton>
          </article>
        ))}
      </section>

      <section className="bg-[#0D1F2D] px-4 py-16 text-center text-white md:px-6">
        <h2 className="text-2xl font-bold">
          {isAr ? "هل تريد أن تصبح مرشداً؟" : "Looking to become a mentor?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/80">
          {isAr
            ? "شارك خبرتك واكسب من تدريب الجيل القادم."
            : "Share your expertise and earn by coaching the next generation."}
        </p>
        <PlatformButton href={mentorApply} variant="gold" className="mt-8">
          {isAr ? "قدّم كمرشد ←" : "Apply to Become a Mentor →"}
        </PlatformButton>
      </section>
    </>
  );
}
