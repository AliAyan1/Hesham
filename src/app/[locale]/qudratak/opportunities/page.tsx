import { redirect } from "next/navigation";

export default async function LegacyQudratakOpportunitiesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/qudrahtech/opportunities`);
}
