import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "teal"
  | "neutral"
  | "gold";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variants: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  teal: "bg-brand-lightTeal text-brand-teal",
  neutral: "bg-gray-100 text-gray-700",
  gold: "bg-[#FDF3E3] text-[#8A6220]",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  variant = "info",
  size = "md",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
