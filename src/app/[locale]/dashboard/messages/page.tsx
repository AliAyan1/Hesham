import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";

export default async function UnifiedMessagesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/login`);

  switch (session.user.role) {
    case UserRole.EMPLOYER:
      redirect(`/${locale}/dashboard/employer/messages`);
    case UserRole.JOBSEEKER:
      redirect(`/${locale}/dashboard/job-seeker/messages`);
    case UserRole.MENTOR:
      redirect(`/${locale}/dashboard/mentor/messages`);
    default:
      redirect(`/${locale}/dashboard`);
  }
}
