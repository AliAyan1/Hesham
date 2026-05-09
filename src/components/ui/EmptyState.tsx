import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

function TealSparkIcon() {
  return (
    <svg
      className="mx-auto h-14 w-14 text-brand-teal"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.25}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4">{icon ?? <TealSparkIcon />}</div>
      <h3 className="text-lg font-bold text-brand-blue">{title}</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-gray-600">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-6">
          <Button type="button" variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
