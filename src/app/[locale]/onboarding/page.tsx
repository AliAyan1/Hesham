import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  if (session.user.onboardingComplete) {
    const role = String(session.user.role ?? "").toUpperCase();
    const next =
      role === UserRole.EMPLOYER
        ? `/${locale}/dashboard/employer`
        : role === UserRole.ADMIN
          ? `/${locale}/dashboard/admin`
          : `/${locale}/dashboard/job-seeker`;
    redirect(next);
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
