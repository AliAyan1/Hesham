import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Locale } from "@/lib/locale-settings";
import { DEFAULT_LOCALE, RTL_LOCALES } from "@/lib/locale-settings";
import {
  type MiddlewareUserRole,
  MIDDLEWARE_DASHBOARD_ROUTES,
} from "@/lib/middleware-routes";
import { isLocale, LOCALE_STORAGE_KEY } from "@/lib/locale-preference";
import { getAuthJwtFromRequest } from "@/lib/auth-jwt";
import { isPublicPath } from "@/lib/middleware-public-paths";

/** next-intl reads this on the server; custom middleware must set it (see getRequestLocale). */
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

/** Extract locale segment from pathname (e.g. /ar/dashboard → "ar") */
function getLocaleFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

/** Saved preference (cookie) wins; otherwise Arabic for all first-time visitors. */
function resolveTargetLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;
  return DEFAULT_LOCALE;
}

function redirectPreservingSearch(
  request: NextRequest,
  pathname: string,
): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return NextResponse.redirect(destination);
}

function nextWithIntlLocale(
  request: NextRequest,
  pathnameLocale: Locale,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NEXT_INTL_LOCALE_HEADER, pathnameLocale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-locale", pathnameLocale);
  response.headers.set(
    "x-dir",
    RTL_LOCALES.includes(pathnameLocale) ? "rtl" : "ltr",
  );
  return response;
}

let maintenanceCache: { active: boolean; checkedAt: number } | null = null;
const MAINTENANCE_CACHE_MS = 60_000;

async function fetchMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.checkedAt < MAINTENANCE_CACHE_MS) {
    return maintenanceCache.active;
  }
  try {
    const res = await fetch(new URL("/api/settings/public", request.url), {
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { isMaintenanceMode?: boolean };
    const active = Boolean(json.isMaintenanceMode);
    maintenanceCache = { active, checkedAt: now };
    return active;
  } catch {
    return false;
  }
}

async function maintenanceGuard(
  request: NextRequest,
  pathnameLocale: Locale,
  pathWithoutLocale: string,
): Promise<NextResponse | null> {
  if (
    pathWithoutLocale.startsWith("/maintenance") ||
    pathWithoutLocale.startsWith("/api/settings/public") ||
    pathWithoutLocale.startsWith("/api/auth") ||
    pathWithoutLocale.startsWith("/auth/login") ||
    pathWithoutLocale.startsWith("/auth/forgot-password") ||
    pathWithoutLocale.startsWith("/auth/reset-password") ||
    pathWithoutLocale.startsWith("/reset-password") ||
    pathWithoutLocale.startsWith("/auth/verify-email") ||
    pathWithoutLocale === "/login"
  ) {
    return null;
  }

  const maintenanceOn = await fetchMaintenanceMode(request);
  if (!maintenanceOn) return null;

  const token = await getAuthJwtFromRequest(request);
  const role = typeof token?.role === "string" ? token.role.toUpperCase() : "";
  if (role === "ADMIN") return null;
  if (pathWithoutLocale.startsWith("/dashboard/admin")) return null;

  return redirectPreservingSearch(request, `/${pathnameLocale}/maintenance`);
}

/** Apex → www (307 keeps POST body for Auth.js credentials login). */
function redirectApexToWww(request: NextRequest): NextResponse | null {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (hostname !== "basalim-consulting.com") return null;

  const destination = request.nextUrl.clone();
  destination.hostname = "www.basalim-consulting.com";
  return NextResponse.redirect(destination, 307);
}

export default async function middleware(request: NextRequest) {
  try {
    const apexRedirect = redirectApexToWww(request);
    if (apexRedirect) return apexRedirect;

    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/.well-known") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const cookieLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
    const persistedLocale =
      cookieLocale && isLocale(cookieLocale) ? cookieLocale : null;

    if (pathname === "/") {
      const locale = resolveTargetLocale(request);
      return redirectPreservingSearch(request, `/${locale}`);
    }

    const pathnameLocale = getLocaleFromPath(pathname);

    if (!pathnameLocale) {
      const locale = resolveTargetLocale(request);
      return redirectPreservingSearch(request, `/${locale}${pathname}`);
    }

    if (persistedLocale && persistedLocale !== pathnameLocale) {
      const suffix = pathname.replace(/^\/[^/]+/, "") || "/";
      const destination = request.nextUrl.clone();
      destination.pathname = `/${persistedLocale}${suffix}`;
      return NextResponse.redirect(destination);
    }

    const pathWithoutLocale = pathname.slice(`/${pathnameLocale}`.length) || "/";

    const maintenanceRedirect = await maintenanceGuard(
      request,
      pathnameLocale,
      pathWithoutLocale,
    );
    if (maintenanceRedirect) return maintenanceRedirect;

    if (isPublicPath(pathWithoutLocale)) {
      /** Do not auto-redirect away from login when a cookie exists — stale JWTs caused login ↔ dashboard loops. */
      return nextWithIntlLocale(request, pathnameLocale);
    }

    if (pathWithoutLocale === "/onboarding") {
      const tOnboard = await getAuthJwtFromRequest(request);
      if (!tOnboard) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}/auth/login`, request.url));
      }
      return nextWithIntlLocale(request, pathnameLocale);
    }

    if (pathWithoutLocale.startsWith("/dashboard")) {
      const token = await getAuthJwtFromRequest(request);

      if (!token) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}/auth/login`, request.url));
      }

      /** Re-check onboarding from DB when JWT may be stale (e.g. just finished onboarding). */
      const jobSeekerDash = pathWithoutLocale.startsWith("/dashboard/job-seeker");
      const employerDash = pathWithoutLocale.startsWith("/dashboard/employer");
      if (token.onboardingComplete === false && (jobSeekerDash || employerDash)) {
        try {
          const statusRes = await fetch(new URL("/api/profile/onboarding", request.url), {
            headers: { cookie: request.headers.get("cookie") ?? "" },
          });
          const statusJson = (await statusRes.json()) as {
            success?: boolean;
            data?: { onboardingComplete?: boolean };
          };
          if (statusRes.ok && statusJson.success && statusJson.data?.onboardingComplete === true) {
            return nextWithIntlLocale(request, pathnameLocale);
          }
        } catch {
          /* fall through to onboarding redirect */
        }
        return NextResponse.redirect(new URL(`/${pathnameLocale}/onboarding`, request.url));
      }

      /** JWT role must match middleware keys (uppercase). Lowercase or garbage ⇒ wrong dashboard prefix + redirects. */
      const rawRole = token.role;
      const normalized =
        typeof rawRole === "string" ? rawRole.toUpperCase() : "";
      const userRole: MiddlewareUserRole =
        normalized === "JOBSEEKER" ||
        normalized === "EMPLOYER" ||
        normalized === "MENTOR" ||
        normalized === "ADMIN"
          ? normalized
          : "JOBSEEKER";
      const expectedBase = MIDDLEWARE_DASHBOARD_ROUTES[userRole];

      if (pathWithoutLocale === "/dashboard") {
        return NextResponse.redirect(new URL(`/${pathnameLocale}${expectedBase}`, request.url));
      }

      const allowedPrefixes: Record<MiddlewareUserRole, string> = {
        JOBSEEKER: MIDDLEWARE_DASHBOARD_ROUTES.JOBSEEKER,
        EMPLOYER: MIDDLEWARE_DASHBOARD_ROUTES.EMPLOYER,
        MENTOR: MIDDLEWARE_DASHBOARD_ROUTES.MENTOR,
        ADMIN: MIDDLEWARE_DASHBOARD_ROUTES.ADMIN,
      };

      if (!pathWithoutLocale.startsWith(allowedPrefixes[userRole])) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}${expectedBase}`, request.url));
      }
    }

    return nextWithIntlLocale(request, pathnameLocale);
  } catch (err) {
    console.error("[middleware]", err);
    const pathnameLocale = getLocaleFromPath(request.nextUrl.pathname);
    const pathWithoutLocale =
      pathnameLocale != null
        ? request.nextUrl.pathname.slice(`/${pathnameLocale}`.length) || "/"
        : request.nextUrl.pathname;
    if (pathWithoutLocale.startsWith("/dashboard") && pathnameLocale) {
      return NextResponse.redirect(
        new URL(`/${pathnameLocale}/auth/login`, request.url),
      );
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
