import { redirect } from "next/navigation";

export default async function EmployerAnalyticsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/employer/insights`);
}
