import { NextResponse, type NextRequest } from "next/server";
import {
  DASHBOARD_PATH,
  LOGIN_PATH,
  REGISTER_PATH,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { isTokenActive } from "@/lib/auth/token";

const HOME_PATH = "/";
const GUEST_ONLY_PATHS: readonly string[] = [LOGIN_PATH, REGISTER_PATH];

// Deny by default: every route NOT listed here needs a session (exact match).
// New public pages must be added here (T-094 landing, T-103 /forgot-password).
const PUBLIC_PATHS: readonly string[] = [HOME_PATH, ...GUEST_ONLY_PATHS];

// Fixed targets only (no ?next= parameter), so there is no open redirect.
function redirectTo(path: string, request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectToLogin(
  request: NextRequest,
  hasStaleCookie: boolean,
): NextResponse {
  const response = redirectTo(LOGIN_PATH, request);
  if (hasStaleCookie) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

// Redirects only. The token signature is NOT verified here (exp is read from the
// payload); the backend verifies the token on every API request. A malformed token
// counts as "no session" and never throws.
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = token !== undefined && isTokenActive(token);

  if (GUEST_ONLY_PATHS.includes(pathname)) {
    return hasSession
      ? redirectTo(DASHBOARD_PATH, request)
      : NextResponse.next();
  }
  if (!PUBLIC_PATHS.includes(pathname) && !hasSession) {
    return redirectToLogin(request, token !== undefined);
  }
  return NextResponse.next();
}

// Static files skip the proxy; with deny-by-default an image from public/ requested
// by a guest would otherwise be redirected to /login.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
