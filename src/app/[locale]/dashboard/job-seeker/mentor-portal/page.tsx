import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import MentorPortalLegacyClient from "./MentorPortalLegacyClient";

export default async function MentorPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  if (session.user.role === UserRole.MENTOR) {
    redirect(`/${locale}/dashboard/mentor`);
  }

  return <MentorPortalLegacyClient locale={locale} />;
}
