"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LoadingSpinner } from "./LoadingSpinner";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-blue text-white hover:bg-brand-navy focus-visible:ring-brand-teal/40",
  secondary:
    "bg-brand-teal text-white hover:bg-brand-darkTeal focus-visible:ring-brand-teal/40",
  outline:
    "border-2 border-brand-blue text-brand-blue bg-transparent hover:bg-brand-lightBlue focus-visible:ring-brand-teal/40",
  ghost:
    "bg-transparent text-brand-blue hover:bg-brand-lightBlue focus-visible:ring-brand-teal/40",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm rounded-md gap-1.5",
  md: "min-h-11 px-4 text-sm rounded-lg gap-2",
  lg: "min-h-12 px-6 text-base rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      leftIcon,
      rightIcon,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled === true || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {/*
          Always keep the same three DOM slots (left / label / right) so toggling `loading`
          does not mount/unmount the leading node. That avoids insertBefore crashes when
          browser extensions mutate the button or during concurrent updates (e.g. ATS scan).
        */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            !loading && leftIcon == null && "hidden",
          )}
          aria-hidden={!loading && leftIcon == null}
        >
          {loading ? (
            <LoadingSpinner size="inline" className="shrink-0" />
          ) : (
            leftIcon
          )}
        </span>
        {children}
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            (loading || rightIcon == null) && "hidden",
          )}
          aria-hidden={loading || rightIcon == null}
        >
          {rightIcon}
        </span>
      </button>
    );
  },
);
