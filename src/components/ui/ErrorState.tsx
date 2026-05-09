import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface ErrorStateProps {
  title: string;
  onRetry: () => void;
  retryLabel: string;
  className?: string;
}

export function ErrorState({
  title,
  onRetry,
  retryLabel,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50/70 px-6 py-10 text-center",
        className,
      )}
    >
      <svg
        className="h-12 w-12 shrink-0 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 9v4m0 4h.01M5.867 21h12.266A2 2 0 0022 18.867V8.867A2 2 0 0019.133 7H17V5a4 4 0 10-10 0v2H4.867A2 2 0 003 8.867v10A2 2 0 005.867 21z"
        />
      </svg>
      <p className="text-sm font-medium text-red-800">{title}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
