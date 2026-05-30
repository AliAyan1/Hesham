import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@/types";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";

export async function requireMentorPage(locale: string, pageLabelKey: string): Promise<{
  locale: string;
  breadcrumbs: BreadcrumbItem[];
}> {
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);
  if (session.user.role !== UserRole.MENTOR) redirect(`/${locale}/dashboard`);

  const tb = await getTranslations({ locale, namespace: "breadcrumb" });
  const tm = await getTranslations({ locale, namespace: "mentor" });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tb("home"), href: "/" },
    { label: tm("dashboard"), href: "/dashboard/mentor" },
    { label: tm(pageLabelKey as "profile"), href: null },
  ];

  return { locale, breadcrumbs };
}
