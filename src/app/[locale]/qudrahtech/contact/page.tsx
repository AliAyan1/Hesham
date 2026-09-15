import { redirectQudrahtechSubpath } from "@/lib/qudrahtech-marketing";

export default async function QudrahtechContactRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirectQudrahtechSubpath(locale, "/contact");
}
