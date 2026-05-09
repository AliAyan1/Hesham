import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardPadding = "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: CardPadding;
  tealAccent?: boolean;
  headerDeepBlue?: boolean;
  title?: string;
  subtitle?: string;
}

const paddingMap: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  padding = "md",
  tealAccent = false,
  headerDeepBlue = false,
  title,
  subtitle,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md",
        tealAccent && "border-l-[3px] border-l-brand-teal",
        className,
      )}
      {...rest}
    >
      {title || subtitle || headerDeepBlue ? (
        <div
          className={cn(
            "rounded-t-xl border-b px-6 py-4",
            headerDeepBlue
              ? "border-brand-darkBlue/20 bg-brand-blue text-white"
              : "border-gray-100 bg-white",
          )}
        >
          {title ? (
            <h3
              className={cn(
                "text-lg font-semibold",
                headerDeepBlue ? "text-white" : "text-brand-blue",
              )}
            >
              {title}
            </h3>
          ) : null}
          {subtitle ? (
            <p
              className={cn(
                "mt-0.5 text-sm",
                headerDeepBlue ? "text-white/85" : "text-gray-600",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={cn(paddingMap[padding], title || subtitle ? "" : "")}>
        {children}
      </div>
    </div>
  );
}
