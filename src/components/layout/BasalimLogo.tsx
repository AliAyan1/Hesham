import Image from "next/image";
import { cn } from "@/lib/cn";

const LOGO_DIM = {
  light: { full: { w: 681, h: 643 }, nav: { w: 681, h: 465 } },
  dark: { full: { w: 706, h: 624 }, nav: { w: 706, h: 465 } },
} as const;

type BasalimLogoProps = {
  variant?: "light" | "dark";
  /** Nav crop: mark, name, and “People. Talent. Growth.” tagline. */
  compact?: boolean;
  size?: "default" | "footer";
  className?: string;
  priority?: boolean;
};

export function BasalimLogo({
  variant = "light",
  compact = false,
  size = "default",
  className,
  priority = false,
}: BasalimLogoProps) {
  const src = compact
    ? variant === "dark"
      ? "/logo-basalim-dark-nav.png"
      : "/logo-basalim-nav.png"
    : variant === "dark"
      ? "/logo-basalim-dark.png"
      : "/logo-basalim.png";

  const dim = compact
    ? LOGO_DIM[variant === "dark" ? "dark" : "light"].nav
    : variant === "dark"
      ? LOGO_DIM.dark.full
      : LOGO_DIM.light.full;

  return (
    <Image
      src={src}
      alt="Basalim Consulting"
      width={dim.w}
      height={dim.h}
      priority={priority}
      className={cn(
        compact
          ? "h-10 w-auto max-w-[168px] object-contain sm:h-11 md:h-12 md:max-w-[188px]"
          : size === "footer"
            ? "h-[4.5rem] w-auto max-w-[240px] object-contain md:h-20 md:max-w-[268px]"
            : "h-11 w-auto max-w-[180px] object-contain md:h-[3.25rem] md:max-w-[200px]",
        className,
      )}
    />
  );
}
