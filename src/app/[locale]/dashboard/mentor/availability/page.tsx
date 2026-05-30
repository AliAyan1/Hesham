import { redirect } from "next/navigation";

export default async function MentorAvailabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/mentor/profile`);
}
