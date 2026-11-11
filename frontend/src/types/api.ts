export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type ProblemDetail = {
  readonly type?: string;
  readonly title?: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly timestamp?: string;
  readonly fieldErrors?: readonly FieldError[];
};

export type HealthResponse = {
  readonly status: "UP";
  readonly timestamp: string;
};
