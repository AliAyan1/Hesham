/**
 * Server-only talent pool helpers. API routes should import from here or `talent-pool-server`.
 * Client components must use `talent-pool-types` only.
 */
export {
  getJobSeekerTalentPoolStatus,
  resolveProctoringSuspendedUntil,
} from "@/lib/talent-pool/talent-pool-server";

export type { JobSeekerTalentPoolStatus, TalentPoolReasonCode } from "@/lib/talent-pool/talent-pool-types";
export { isProctoringTalentPoolReason } from "@/lib/talent-pool/talent-pool-types";
