import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, RTL_LOCALES, DASHBOARD_ROUTES } from "@/lib/constants";
import { UserRole } from "@/types";
import type { Locale } from "@/lib/constants";
import { getToken } from "next-auth/jwt";
import { isLocale, LOCALE_STORAGE_KEY } from "@/lib/locale-preference";
import { getAuthSecret } from "@/lib/auth-secret";

/** next-intl reads this on the server; custom middleware must set it (see getRequestLocale). */
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/api/auth"];

/** Extract locale segment from pathname (e.g. /ar/dashboard → "ar") */
function getLocaleFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

/** Match Accept-Language to one of six locales; default Arabic */
function localeFromAcceptLanguage(request: NextRequest): Locale {
  const acceptLang = request.headers.get("accept-language") ?? "";
  for (const part of acceptLang.split(",")) {
    const raw = part.split(";")[0]?.trim()?.split("-")[0]?.toLowerCase();
    if (raw && LOCALES.includes(raw as Locale)) {
      return raw as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

/** Cookie wins on first visits; Accept-Language if no cookie */
function resolveTargetLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(request);
}

function redirectPreservingSearch(
  request: NextRequest,
  pathname: string,
): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return NextResponse.redirect(destination);
}

/** Forwards locale to next-intl RSC APIs and keeps response meta headers. */
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

export default async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
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
      const suffix = pathname.replace(/^\/[^/]+/, "");
      const nextPath = `/${persistedLocale}${suffix}`;
      return redirectPreservingSearch(request, nextPath);
    }

    const pathWithoutLocale = pathname.slice(`/${pathnameLocale}`.length) || "/";

    if (PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p))) {
      return nextWithIntlLocale(request, pathnameLocale);
    }

    if (pathWithoutLocale === "/onboarding") {
      const tOnboard = await getToken({
        req: request,
        secret: getAuthSecret(),
      });
      if (!tOnboard) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}/auth/login`, request.url));
      }
      return nextWithIntlLocale(request, pathnameLocale);
    }

    if (pathWithoutLocale.startsWith("/dashboard")) {
      const token = await getToken({
        req: request,
        secret: getAuthSecret(),
      });

      if (!token) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}/auth/login`, request.url));
      }

      /** First login wizard (only block dashboard root; deeper routes remain usable). */
      if (
        token.onboardingComplete === false &&
        (pathWithoutLocale === "/dashboard/job-seeker" ||
          pathWithoutLocale === "/dashboard/employer")
      ) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}/onboarding`, request.url));
      }

      const userRole = (token.role as UserRole | undefined) ?? UserRole.JOBSEEKER;
      const expectedBase = DASHBOARD_ROUTES[userRole];

      if (pathWithoutLocale === "/dashboard") {
        return NextResponse.redirect(new URL(`/${pathnameLocale}${expectedBase}`, request.url));
      }

      const allowedPrefixes: Record<UserRole, string> = {
        [UserRole.JOBSEEKER]: "/dashboard/job-seeker",
        [UserRole.EMPLOYER]: "/dashboard/employer",
        [UserRole.ADMIN]: "/dashboard/admin",
      };

      if (!pathWithoutLocale.startsWith(allowedPrefixes[userRole])) {
        return NextResponse.redirect(new URL(`/${pathnameLocale}${expectedBase}`, request.url));
      }
    }

    return nextWithIntlLocale(request, pathnameLocale);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
