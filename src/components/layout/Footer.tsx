import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";
import { getContent } from "@/lib/cms";
import { hrefRegisterMentor } from "@/lib/i18n-hrefs";

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  const tf = await getTranslations({ locale, namespace: "footer" });
  const content = await getContent(locale);
  const isRtl = locale === "ar" || locale === "ur";

  return (
    <footer
      dir={isRtl ? "rtl" : "ltr"}
      className="border-t border-brand-darkBlue/40 bg-[#0D2137] text-white"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo variant="dark" size="md" className="max-w-[220px]" />
            <p className="max-w-md text-sm text-white/75">
              {content["footer_tagline"] ?? tf("slogan")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{tf("colPlatform")}</p>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>
                <Link href="/jobs" className="hover:text-brand-teal">
                  {tf("linkJobs")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/job-seeker/cv-builder" className="hover:text-brand-teal">
                  {tf("linkCvBuilder")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/job-seeker/assessment" className="hover:text-brand-teal">
                  {tf("linkAssessment")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/mentor" className="hover:text-brand-teal">
                  {tf("linkMentors")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{tf("colCompany")}</p>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>
                <Link href="/about" className="hover:text-brand-teal">
                  {tf("about")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-brand-teal">
                  {tf("linkBlog")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-teal">
                  {tf("contact")}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-brand-teal">
                  {tf("linkCareers")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{tf("colMentors")}</p>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>
                <Link href={hrefRegisterMentor} className="hover:text-brand-teal">
                  {tf("linkJoinMentor")}
                </Link>
              </li>
              <li>
                <Link href="/pricing#pricing" className="hover:text-brand-teal">
                  {tf("linkHowItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-brand-teal">
                  {tf("linkEarnings")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/60">
          {tf("copyright")}
        </div>
      </div>
    </footer>
  );
}
