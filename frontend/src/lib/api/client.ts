import { ApiError, NetworkError, RequestTimeoutError } from "@/lib/api/errors";
import { PUBLIC_AUTH_API_PATHS } from "@/lib/auth/constants";
import { notifyUnauthorized } from "@/lib/auth/events";
import type { ProblemDetail } from "@/types/api";

export const REQUEST_TIMEOUT_MS = 5000;

const HTTP_NO_CONTENT = 204;
const HTTP_UNAUTHORIZED = 401;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly token?: string;
};

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return baseUrl.replace(/\/+$/, "");
}

function buildHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  return headers;
}

function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "TimeoutError"
  );
}

function isPublicAuthPath(path: string): boolean {
  const pathname = path.split("?")[0];
  return PUBLIC_AUTH_API_PATHS.some((publicPath) => publicPath === pathname);
}

async function send(url: string, options: RequestOptions): Promise<Response> {
  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers: buildHeaders(options),
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw isTimeoutError(error)
      ? new RequestTimeoutError()
      : new NetworkError();
  }
}

async function parseProblem(
  response: Response,
): Promise<ProblemDetail | undefined> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return undefined;
  }
}

export type ApiResult<T> = {
  readonly status: number;
  readonly data: T;
};

// Same as apiRequest, but also tells the success status (e.g. 201 created vs 200 updated).
export async function apiRequestWithStatus<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const response = await send(`${getBaseUrl()}${path}`, options);
  if (!response.ok) {
    if (response.status === HTTP_UNAUTHORIZED && !isPublicAuthPath(path)) {
      notifyUnauthorized();
    }
    throw new ApiError(response.status, await parseProblem(response));
  }
  if (response.status === HTTP_NO_CONTENT) {
    return { status: response.status, data: undefined as T };
  }
  return { status: response.status, data: (await response.json()) as T };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await apiRequestWithStatus<T>(path, options);
  return data;
}
