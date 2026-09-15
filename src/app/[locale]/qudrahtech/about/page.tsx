import { redirect } from "next/navigation";
import { QUDRAHTECH_MARKETING_PATH } from "@/lib/qudrahtech-marketing";

export default async function QudrahtechAboutRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${QUDRAHTECH_MARKETING_PATH}`);
}
