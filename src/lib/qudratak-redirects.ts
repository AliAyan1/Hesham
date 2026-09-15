import { redirectQudrahtechSubpath } from "@/lib/qudrahtech-marketing";

/** @deprecated Legacy import — use redirectQudrahtechSubpath */
export function redirectQudratakSubpath(locale: string, path: string): never {
  return redirectQudrahtechSubpath(locale, path);
}
