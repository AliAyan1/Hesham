/** Shared proctoring strike policy for assessments and AI interviews. */

export const PROCTORING_MAX_WARNINGS = 3;
export const PROCTORING_COOLDOWN_HOURS = 24;

export function proctoringCooldownUntil(from = new Date()): Date {
  return new Date(from.getTime() + PROCTORING_COOLDOWN_HOURS * 60 * 60 * 1000);
}

export function isProctoringSuspended(suspendedUntil: Date | null | undefined): boolean {
  if (!suspendedUntil) return false;
  return suspendedUntil.getTime() > Date.now();
}

export type ProctoringViolationKind =
  | "tab_switch"
  | "fullscreen_exit"
  | "screen_share"
  | "not_monitor"
  | "face_not_visible"
  | "multiple_faces"
  | "looking_away"
  | "copy_paste"
  | "ai_typing"
  | "suspicious_activity";

/** Maps internal violation labels to i18n keys under assessment.proctoring */
export const VIOLATION_I18N_KEY: Record<string, ProctoringViolationKind> = {
  tab_switch: "tab_switch",
  fullscreen_exit: "fullscreen_exit",
  screen_share: "screen_share",
  not_monitor: "not_monitor",
  face_not_visible: "face_not_visible",
  multiple_faces: "multiple_faces",
  looking_away: "looking_away",
  copy_paste: "copy_paste",
  ai_typing: "ai_typing",
  suspicious_activity: "suspicious_activity",
};
