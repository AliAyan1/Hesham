"use client";

import { ApplicationStatus } from "@/types";
import { EMPLOYER_WORKFLOW_STATUSES } from "@/lib/applications/workflow-status";
import { applicationStatusBadgeVariant, applicationStatusTranslationKey } from "@/components/dashboard/applicationStatusUi";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

type Props = {
  value: ApplicationStatus;
  disabled?: boolean;
  onChange: (status: ApplicationStatus) => void;
  label: (key: string) => string;
  compact?: boolean;
};

export function ApplicationWorkflowStatusControl({
  value,
  disabled,
  onChange,
  label,
  compact,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact ? "" : "mt-3")}>
      {EMPLOYER_WORKFLOW_STATUSES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
              active
                ? "border-brand-teal bg-brand-lightTeal text-brand-teal"
                : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-gray-50",
            )}
          >
            <Badge variant={applicationStatusBadgeVariant(s)} size="sm" className="pointer-events-none">
              {label(applicationStatusTranslationKey(s))}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
