import { ApplicationStatus } from "@prisma/client";

/** Primary employer → job seeker workflow (no schema migration). */
export const EMPLOYER_WORKFLOW_STATUSES = [
  ApplicationStatus.PENDING,
  ApplicationStatus.REVIEWED,
  ApplicationStatus.SHORTLISTED,
] as const;

export type EmployerWorkflowStatus = (typeof EMPLOYER_WORKFLOW_STATUSES)[number];

export function isEmployerWorkflowStatus(s: ApplicationStatus): s is EmployerWorkflowStatus {
  return (EMPLOYER_WORKFLOW_STATUSES as readonly ApplicationStatus[]).includes(s);
}

/** Human label for notifications (English). */
export function applicationStatusLabelEn(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "Waiting";
    case ApplicationStatus.REVIEWED:
      return "Viewed";
    case ApplicationStatus.SHORTLISTED:
      return "Shortlisted";
    case ApplicationStatus.REJECTED:
      return "Rejected";
    case ApplicationStatus.HIRED:
      return "Hired";
    default:
      return status;
  }
}

export function applicationStatusLabelAr(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.PENDING:
      return "قيد الانتظار";
    case ApplicationStatus.REVIEWED:
      return "تمت المشاهدة";
    case ApplicationStatus.SHORTLISTED:
      return "في القائمة المختصرة";
    case ApplicationStatus.REJECTED:
      return "مرفوض";
    case ApplicationStatus.HIRED:
      return "تم التوظيف";
    default:
      return status;
  }
}
