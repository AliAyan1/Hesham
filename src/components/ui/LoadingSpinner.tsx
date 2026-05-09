"use client";

import { cn } from "@/lib/cn";

type SpinnerSize = "inline" | "sm" | "md" | "full";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const borderBySize: Record<SpinnerSize, string> = {
  inline: "h-4 w-4 border-2",
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-[3px]",
  full: "h-12 w-12 border-[3px]",
};

export function LoadingSpinner({
  size = "md",
  label,
  className,
}: LoadingSpinnerProps) {
  const ring = (
    <div
      role="status"
      aria-label={label ?? "Loading"}
      className={cn(
        "animate-spin rounded-full border-brand-teal border-t-transparent",
        borderBySize[size],
        className,
      )}
    />
  );

  if (size === "full") {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4"
        role="status"
        aria-live="polite"
      >
        {ring}
        {label ? (
          <p className="text-center text-sm text-gray-600">{label}</p>
        ) : null}
      </div>
    );
  }

  return ring;
}
