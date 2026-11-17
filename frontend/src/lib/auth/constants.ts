export const SESSION_COOKIE_NAME = "saldo_access_token";

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";
export const DASHBOARD_PATH = "/dashboard";

// Public API endpoints: a 401 here is a normal answer (wrong password), not an expired session.
export const PUBLIC_AUTH_API_PATHS = ["/auth/login", "/auth/register"] as const;

export const UNAUTHORIZED_EVENT = "saldo:unauthorized";
export const SESSION_STARTED_EVENT = "saldo:session-started";
