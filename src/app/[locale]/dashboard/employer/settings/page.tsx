import { redirect } from "next/navigation";

export default async function EmployerSettingsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/employer/profile`);
}
