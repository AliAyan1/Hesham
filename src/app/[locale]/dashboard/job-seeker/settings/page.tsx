import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UserRole } from "@/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";

export default async function JobSeekerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.JOBSEEKER) redirect(`/${locale}/dashboard`);

  const tSide = await getTranslations({ locale, namespace: "sidebar" });
  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const t = await getTranslations({ locale, namespace: "userSettings" });
  const title = tSide("jobSeeker.settings" as never);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tb("dashboard"), href: "/dashboard/job-seeker" },
    { label: title, href: null },
  ];

  const links = [
    { href: "/dashboard/job-seeker/profile", label: t("profileLink") },
    { href: "/dashboard/job-seeker/notifications", label: t("notificationsLink") },
    { href: "/dashboard/job-seeker/payments", label: t("paymentsLink") },
  ] as const;

  return (
    <DashboardLayout locale={locale} role={UserRole.JOBSEEKER} breadcrumbs={breadcrumbs}>
      <h1 className="text-2xl font-bold text-[#0D2137]">{title}</h1>
      <p className="mt-2 text-sm text-[#6B7280]">{t("jobSeekerHint")}</p>
      <ul className="mt-6 grid gap-3 sm:max-w-md">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-11 items-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-[#0F4C75] hover:bg-[#EFF6FF]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
