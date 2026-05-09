import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  const tf = await getTranslations({ locale, namespace: "footer" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const isRtl = locale === "ar" || locale === "ur";

  return (
    <footer
      dir={isRtl ? "rtl" : "ltr"}
      className="border-t border-brand-darkBlue/40 bg-brand-navy text-white"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-[100vw] flex-col gap-10 px-6 py-14 lg:flex-row lg:justify-between lg:gap-14">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Logo variant="dark" size="md" className="max-w-[220px]" />
          <p className="max-w-md text-sm text-white/75">{tf("slogan")}</p>
        </div>

        <nav className="flex shrink-0 flex-wrap gap-10" aria-label={tf("about")}>
          <ul className="flex min-w-[140px] flex-col gap-3 text-sm">
            <li>
              <Link href="/about" className="hover:text-brand-teal">
                {tf("about")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-teal">
                {tf("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-teal">
                {tf("terms")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-teal">
                {tf("contact")}
              </Link>
            </li>
          </ul>
          <div className="flex gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tf("socialFacebookAria")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tf("socialLinkedInAria")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tf("socialXTwitterAria")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.901 3H21.92l-6.705 8.683L23 21h-5.838l-4.579-6.087L6.834 21H3l7.078-10.086L3 3h6.058l4.097 6.068L18.901 3z" />
              </svg>
            </a>
          </div>
        </nav>
      </div>
      <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/60">
        {tf("copyright")} · <span suppressHydrationWarning>{tc("slogan")}</span>
      </div>
    </footer>
  );
}
