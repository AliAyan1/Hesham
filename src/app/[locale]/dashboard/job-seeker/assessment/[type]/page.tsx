import { redirect } from "next/navigation";

/** Legacy assessment type URLs → unified 5-step assessment home. */
export default async function LegacyAssessmentTypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/job-seeker/assessment`);
}
