import { ApiError, NetworkError, RequestTimeoutError } from "@/lib/api/errors";
import type { ProblemDetail } from "@/types/api";

export const REQUEST_TIMEOUT_MS = 5000;

const HTTP_NO_CONTENT = 204;

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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(`${getBaseUrl()}${path}`, options);
  if (!response.ok) {
    throw new ApiError(response.status, await parseProblem(response));
  }
  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
