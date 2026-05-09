/** NextAuth v5 prefers AUTH_SECRET; many projects still use NEXTAUTH_SECRET. */
export function getAuthSecret(): string | undefined {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return typeof s === "string" && s.length > 0 ? s : undefined;
}
