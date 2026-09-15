import { redirect } from "next/navigation";

export default async function LegacyQudratakMentorsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/qudrahtech/mentors`);
}
