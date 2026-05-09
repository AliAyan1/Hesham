const GENERIC_IDS = new Set(
  ["user", "users", "admin", "test", "demo", "guest", "info", "mail", "contact", "support", "email", "noreply", "no-reply", "me", "unknown"].map(
    (s) => s.toLowerCase(),
  ),
);

function initialsFromEmailLocal(email: string): string | null {
  const local = (email.split("@")[0] ?? "").trim().toLowerCase();
  if (!local || local.length < 2 || GENERIC_IDS.has(local)) {
    return null;
  }
  return local.slice(0, 2).toUpperCase();
}

/**
 * Avatar letters, or null to show a silent user silhouette instead (avoids “US” from user@… placeholders).
 */
export function avatarLettersOrNull(name: string | null | undefined, email: string): string | null {
  const n = name?.trim();
  if (n && n.length > 0 && !GENERIC_IDS.has(n.toLowerCase())) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (n.length >= 2) {
      return n.slice(0, 2).toUpperCase();
    }
    if (n.length === 1) {
      return n[0]!.toUpperCase();
    }
  }
  return initialsFromEmailLocal(email);
}
