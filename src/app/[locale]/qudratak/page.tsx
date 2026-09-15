import { redirect } from "next/navigation";
import { QUDRAHTECH_MARKETING_PATH } from "@/lib/qudrahtech-marketing";

/** Legacy path — platform lives at /qudrahtech on basalim-consulting.com */
export default async function LegacyQudratakRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${QUDRAHTECH_MARKETING_PATH}`);
}
