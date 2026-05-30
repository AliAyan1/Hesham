import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardPathForRole } from "@/lib/subscription";

/** Logged-in users should use the dashboard, not the marketing site. */
export async function redirectAuthenticatedUserFromMarketing(locale: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) return;

  const role = String(session.user.role ?? "JOBSEEKER");
  redirect(`/${locale}${dashboardPathForRole(role)}`);
}
