"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
  /** `light` shows the regular logo; `dark` shows the white logo */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  priority?: boolean;
};

const PX: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 120,
  md: 150,
  lg: 180,
  xl: 220,
};

export function Logo({
  className,
  variant = "light",
  size = "md",
  href = "/",
  priority = false,
}: LogoProps) {
  const locale = useLocale();
  const alt = locale === "ar" ? "قدرتك" : "QudrahTech";

  // Single asset until `public/logo-white.png` exists; `variant` reserved for future src swap on dark UIs.
  const src = "/logo.png";
  void variant;
  const width = PX[size];
  const height = Math.round(width * 0.32);

  return (
    <Link
      href={href}
      aria-label={alt}
      className={cn("inline-flex items-center", className)}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto max-w-full"
      />
    </Link>
  );
}

