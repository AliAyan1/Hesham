import { Link } from "@/i18n/navigation";
import { BASALIM_CALENDLY_URL } from "@/lib/basalim-public";

type BasalimCtaProps = {
  locale: string;
  titleEn: string;
  titleAr: string;
  buttonEn: string;
  buttonAr: string;
  href?: string;
  subtitleEn?: string;
  subtitleAr?: string;
};

const buttonClassName =
  "mt-8 inline-flex rounded-md bg-[#1A6B5A] px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#155A4A]";

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function BasalimCta({
  locale,
  titleEn,
  titleAr,
  buttonEn,
  buttonAr,
  href = BASALIM_CALENDLY_URL,
  subtitleEn,
  subtitleAr,
}: BasalimCtaProps) {
  const isAr = locale === "ar";
  const label = isAr ? buttonAr : buttonEn;

  return (
    <section className="bg-[#F5F3EE] px-4 py-16 text-center md:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-[#0D1F2D] md:text-3xl">{isAr ? titleAr : titleEn}</h2>
        {subtitleEn || subtitleAr ? (
          <p className="mt-4 text-[#6B7280]">{isAr ? subtitleAr : subtitleEn}</p>
        ) : null}
        {isExternalHref(href) ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName}
          >
            {label}
          </a>
        ) : (
          <Link href={href} className={buttonClassName}>
            {label}
          </Link>
        )}
      </div>
    </section>
  );
}
