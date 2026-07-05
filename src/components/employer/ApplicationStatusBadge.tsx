import { ApplicationStatus } from "@/types";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<
  ApplicationStatus,
  { bg: string; text: string; label: string }
> = {
  [ApplicationStatus.PENDING]: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Pending" },
  [ApplicationStatus.REVIEWED]: { bg: "bg-[#EFF6FF]", text: "text-[#0F4C75]", label: "Viewed" },
  [ApplicationStatus.SHORTLISTED]: { bg: "bg-[#E1F5EE]", text: "text-[#1D9E75]", label: "Shortlisted ✓" },
  [ApplicationStatus.REJECTED]: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", label: "Declined" },
  [ApplicationStatus.HIRED]: { bg: "bg-[#DCFCE7]", text: "text-[#166534]", label: "Hired" },
};

/** REVIEWED displays as "Viewed"; PENDING can read as "Under Review" when employer is actively reviewing. */
export function ApplicationStatusBadge({
  status,
  className,
  waitingLabel,
}: {
  status: ApplicationStatus;
  className?: string;
  waitingLabel?: boolean;
}) {
  const base = STATUS_STYLES[status] ?? STATUS_STYLES[ApplicationStatus.PENDING];
  const label =
    waitingLabel && status === ApplicationStatus.PENDING
      ? "Under Review"
      : status === ApplicationStatus.REVIEWED
        ? "Viewed"
        : base.label;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === ApplicationStatus.PENDING && waitingLabel
          ? "bg-[#FEF9C3] text-[#854D0E]"
          : `${base.bg} ${base.text}`,
        className,
      )}
    >
      {label}
    </span>
  );
}
