export function appUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "https://Qudrahtech.sa").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
