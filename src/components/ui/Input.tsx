"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isRTL?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  hidePasswordToggle?: boolean;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="h-5 w-5 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      isRTL = false,
      leftIcon,
      rightIcon,
      hidePasswordToggle = false,
      className,
      disabled,
      type = "text",
      required,
      id: idProp,
      ...rest
    },
    ref,
  ) {
    const t = useTranslations("common");
    const genId = useId();
    const id = idProp ?? genId;
    const errId = `${id}-error`;
    const [showPwd, setShowPwd] = useState(false);
    const isPwd = type === "password";
    const inputType = isPwd && showPwd ? "text" : type;

    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="w-full">
        <label
          htmlFor={id}
          className={cn(
            "mb-1.5 block text-sm font-medium text-gray-900",
            isRTL && "text-right",
          )}
        >
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
        <div className="relative">
          {leftIcon ? (
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500",
                isRTL ? "right-3" : "left-3",
              )}
              aria-hidden
            >
              {leftIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            aria-required={required}
            className={cn(
              "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 transition-shadow placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60",
              isRTL && "text-right",
              leftIcon ? (isRTL ? "pr-10" : "pl-10") : "",
              isPwd && !hidePasswordToggle
                ? isRTL
                  ? "pl-11"
                  : "pr-11"
                : rightIcon
                  ? isRTL
                    ? "pl-10"
                    : "pr-10"
                  : "",
              className,
            )}
            {...rest}
          />
          {isPwd && !hidePasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className={cn(
                "absolute top-1/2 flex h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
                isRTL ? "left-1" : "right-1",
              )}
              aria-label={showPwd ? t("hidePassword") : t("showPassword")}
            >
              <EyeIcon open={showPwd} />
            </button>
          ) : rightIcon ? (
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500",
                isRTL ? "left-3" : "right-3",
              )}
              aria-hidden
            >
              {rightIcon}
            </span>
          ) : null}
        </div>
        {error ? (
          <p id={errId} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
