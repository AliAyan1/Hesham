import { redirect } from "next/navigation";

export default async function EmployerAssessmentsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/employer/insights`);
}
