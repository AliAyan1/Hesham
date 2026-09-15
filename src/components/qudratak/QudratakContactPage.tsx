import { Mail } from "lucide-react";
import { QudratakInnerHero } from "@/components/qudratak/QudratakInnerHero";
import { QudratakSupportForm } from "@/components/qudratak/QudratakSupportForm";
import { BasalimLinkedInLink } from "@/components/layout/BasalimLinkedInLink";

const SUPPORT_EMAIL = "support@basalim-consulting.com";

type Props = { locale: string };

export function QudratakContactPage({ locale }: Props) {
  const isAr = locale === "ar";

  return (
    <>
      <QudratakInnerHero
        locale={locale}
        titleEn="We're Here for You."
        titleAr="نحن هنا لك"
      />

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6">
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-[#0D1F2D]">
            {isAr ? "خيارات التواصل" : "Contact options"}
          </h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:bg-[#F5F3EE]"
          >
            <Mail className="h-6 w-6 text-[#1A6B5A]" aria-hidden />
            <span className="font-medium">{SUPPORT_EMAIL}</span>
          </a>
          <div className="rounded-xl border border-gray-100 p-4 hover:bg-[#F5F3EE]">
            <BasalimLinkedInLink className="text-[#1A6B5A]" iconClassName="h-10 w-10" showLabel />
          </div>
        </div>
        <QudratakSupportForm locale={locale} />
      </section>
    </>
  );
}
