import type { ProblemDetail } from "@/types/api";

export const NETWORK_ERROR_MESSAGE =
  "Nie można połączyć się z serwerem. Sprawdź połączenie z internetem i spróbuj ponownie.";
export const TIMEOUT_ERROR_MESSAGE =
  "Serwer odpowiada zbyt wolno. Spróbuj ponownie za chwilę.";
export const UNKNOWN_ERROR_MESSAGE =
  "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
export const SERVER_ERROR_MESSAGE =
  "Serwer zwrócił błąd. Spróbuj ponownie za chwilę.";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | undefined;

  constructor(status: number, problem?: ProblemDetail) {
    super(problem?.title ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export class NetworkError extends Error {
  constructor() {
    super(NETWORK_ERROR_MESSAGE);
    this.name = "NetworkError";
  }
}

export class RequestTimeoutError extends Error {
  constructor() {
    super(TIMEOUT_ERROR_MESSAGE);
    this.name = "RequestTimeoutError";
  }
}

export function getUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.problem?.detail ?? SERVER_ERROR_MESSAGE;
  }
  if (error instanceof NetworkError || error instanceof RequestTimeoutError) {
    return error.message;
  }
  return UNKNOWN_ERROR_MESSAGE;
}
