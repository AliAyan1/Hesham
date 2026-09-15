import { redirect } from "next/navigation";

/** Platform product landing on basalim-consulting.com (not a separate domain). */
export const QUDRAHTECH_MARKETING_PATH = "/qudrahtech";

export function redirectQudrahtechSubpath(locale: string, path: string): never {
  redirect(`/${locale}${path}`);
}
