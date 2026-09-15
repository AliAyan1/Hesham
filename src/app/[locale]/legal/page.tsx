import { Link } from "@/i18n/navigation";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BasalimPageHero } from "@/components/basalim/BasalimPageHero";

const LINKS = [
  { href: "/legal/privacy", en: "Privacy Policy", ar: "سياسة الخصوصية" },
  { href: "/legal/terms", en: "Terms of Use", ar: "شروط الاستخدام" },
  { href: "/legal/cookies", en: "Cookie Policy", ar: "سياسة ملفات تعريف الارتباط" },
  { href: "/legal/information-security", en: "Information Security", ar: "أمن المعلومات" },
  { href: "/legal/disclaimer", en: "Disclaimer", ar: "إخلاء المسؤولية" },
];

export default async function LegalIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <PublicLayout locale={locale}>
      <BasalimPageHero
        locale={locale}
        titleEn="Policies & Important Information"
        titleAr="السياسات والمعلومات المهمة"
        subtitleEn="Trust. Transparency. Always."
        subtitleAr="الثقة. الشفافية. دائماً."
        heightClass="min-h-[40vh]"
      />
      <section className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-100 bg-white shadow-sm">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between px-6 py-4 font-semibold text-[#0D1F2D] hover:bg-[#F5F3EE]"
              >
                {isAr ? link.ar : link.en}
                <span className="text-[#1A6B5A]" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicLayout>
  );
}
