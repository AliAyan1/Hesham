import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

function dashboardPathForRole(locale: string, role: string): string {
  const r = role.toUpperCase();
  if (r === UserRole.EMPLOYER) return `/${locale}/dashboard/employer`;
  if (r === UserRole.ADMIN) return `/${locale}/dashboard/admin`;
  if (r === UserRole.MENTOR) return `/${locale}/dashboard/mentor`;
  return `/${locale}/dashboard/job-seeker`;
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login`);
  }

  const dbUser = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true, role: true },
  });

  if (dbUser?.onboardingComplete) {
    redirect(dashboardPathForRole(locale, String(dbUser.role ?? session.user.role ?? "")));
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F8FAFC]">
      <PublicNavbar locale={locale} />
      <main className="flex-1">
        <OnboardingClient />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
