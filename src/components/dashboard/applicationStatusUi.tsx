import { ApplicationStatus } from "@prisma/client";
import type { BadgeProps } from "@/components/ui/Badge";

export function applicationStatusBadgeVariant(
  status: ApplicationStatus,
): NonNullable<BadgeProps["variant"]> {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "neutral";
    case ApplicationStatus.REVIEWED:
      return "info";
    case ApplicationStatus.SHORTLISTED:
      return "gold";
    case ApplicationStatus.REJECTED:
      return "danger";
    case ApplicationStatus.HIRED:
      return "success";
    default:
      return "neutral";
  }
}

export function applicationStatusTranslationKey(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "applicationStatusPENDING";
    case ApplicationStatus.REVIEWED:
      return "applicationStatusREVIEWED";
    case ApplicationStatus.SHORTLISTED:
      return "applicationStatusSHORTLISTED";
    case ApplicationStatus.REJECTED:
      return "applicationStatusREJECTED";
    case ApplicationStatus.HIRED:
      return "applicationStatusHIRED";
    default:
      return "applicationStatusPENDING";
  }
}
