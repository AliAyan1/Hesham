import { getTranslations } from "next-intl/server";
import { BasalimLogo } from "@/components/layout/BasalimLogo";
import { BasalimLinkedInLink } from "@/components/layout/BasalimLinkedInLink";
import { Link } from "@/i18n/navigation";
import { getContent } from "@/lib/cms";
import {
  QudrahtechJoinUrl,
  QUDRAH_PLATFORM_NAME,
  QUDRAH_PLATFORM_NAME_AR,
} from "@/lib/basalim-public";

type BasalimFooterProps = {
  locale: string;
};

export async function BasalimFooter({ locale }: BasalimFooterProps) {
  const isAr = locale === "ar";
  const tContact = await getTranslations({ locale, namespace: "pages.contact" });
  const content = await getContent(locale);

  const email = content["contact_email"] ?? tContact("emailValue");
  const address = content["contact_address"] ?? tContact("locationValue");

  const joinUrl = QudrahtechJoinUrl(locale);

  return (
    <footer className="bg-[#0D1F2D] text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BasalimLogo variant="dark" size="footer" />
            <div className="mt-6">
              <BasalimLinkedInLink />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/90">
              {isAr ? "الشركة" : "Company"}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/about" className="transition-colors hover:text-white">
                  {isAr ? "من نحن" : "About"}
                </Link>
              </li>
              <li>
                <Link href="/services" className="transition-colors hover:text-white">
                  {isAr ? "الخدمات" : "Services"}
                </Link>
              </li>
              <li>
                <Link href="/industries" className="transition-colors hover:text-white">
                  {isAr ? "القطاعات" : "Industries"}
                </Link>
              </li>
              <li>
                <Link href="/insights" className="transition-colors hover:text-white">
                  {isAr ? "المعرفة" : "Insights"}
                </Link>
              </li>
              <li>
                <Link href="/clients" className="transition-colors hover:text-white">
                  {isAr ? "العملاء" : "Clients"}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="transition-colors hover:text-white">
                  {isAr ? "فرص العمل" : "Careers"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/90">
              {isAr ? "الخدمات" : "Services"}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link
                  href="/services/organizational-development"
                  className="transition-colors hover:text-white"
                >
                  {isAr ? "التطوير التنظيمي" : "Org Development"}
                </Link>
              </li>
              <li>
                <Link href="/services/talent-acquisition" className="transition-colors hover:text-white">
                  {isAr ? "التوظيف" : "Talent Acquisition"}
                </Link>
              </li>
              <li>
                <Link href="/services/learning-development" className="transition-colors hover:text-white">
                  {isAr ? "التعلم" : "Learning"}
                </Link>
              </li>
              <li>
                <Link href="/services/leadership-development" className="transition-colors hover:text-white">
                  {isAr ? "القيادات" : "Leadership"}
                </Link>
              </li>
              <li>
                <Link href="/services/hospitality-tourism" className="transition-colors hover:text-white">
                  {isAr ? "الضيافة" : "Hospitality"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/90">
              {isAr ? "تواصل" : "Connect"}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">
                  {isAr ? "اتصل بنا" : "Contact"}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">
                  {isAr ? "احجز استشارة" : "Book Consultation"}
                </Link>
              </li>
              <li>
                <Link href="/legal" className="transition-colors hover:text-white">
                  {isAr ? "السياسات القانونية" : "Legal & Policies"}
                </Link>
              </li>
              <li>
                <a href={`mailto:${email}`} className="transition-colors hover:text-white">
                  {email}
                </a>
              </li>
              <li>{address}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
            <p>
              {isAr
                ? "© 2026 باسالم كونسلتينج. جميع الحقوق محفوظة."
                : "© 2026 Basalim Consulting. All rights reserved."}
            </p>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {isAr ? (
                <>
                  مدعوم من{" "}
                  <span className="font-semibold text-[#C9A84C]">{QUDRAH_PLATFORM_NAME}</span>
                </>
              ) : (
                <>
                  Powered by{" "}
                  <span className="font-semibold text-[#C9A84C]">{QUDRAH_PLATFORM_NAME}</span>
                </>
              )}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
