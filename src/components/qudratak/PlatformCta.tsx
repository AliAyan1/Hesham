import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PlatformCtaProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** External link to Qudrahtech platform — always opens a new tab. */
export function PlatformCta({ href, children, className, onClick }: PlatformCtaProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

type PlatformButtonProps = PlatformCtaProps & {
  variant?: "gold" | "outline" | "dark";
};

export function PlatformButton({
  href,
  children,
  className,
  variant = "gold",
}: PlatformButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90";
  const variants = {
    gold: "bg-[#C9A84C] text-[#0D1F2D]",
    outline: "border-2 border-white bg-transparent text-white",
    dark: "bg-[#0D1F2D] text-white",
  };
  return (
    <PlatformCta href={href} className={cn(base, variants[variant], className)}>
      {children}
    </PlatformCta>
  );
}
