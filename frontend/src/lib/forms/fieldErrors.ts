import type { FieldError } from "@/types/api";

// Messages of the fields of one form: a field without an error is absent.
export type FieldMessages<Field extends string> = {
  readonly [F in Field]?: string;
};

export type FormParseResult<Field extends string, Request> =
  | { readonly status: "invalid"; readonly errors: FieldMessages<Field> }
  | { readonly status: "valid"; readonly request: Request };

// The backend messages of the fields this form has; other fields are left to the general message.
export function pickFieldErrors<Field extends string>(
  fields: readonly Field[],
  fieldErrors: readonly FieldError[] | undefined,
): FieldMessages<Field> {
  const picked: { [F in Field]?: string } = {};
  for (const field of fields) {
    const match = fieldErrors?.find((error) => error.field === field);
    if (match !== undefined) {
      picked[field] = match.message;
    }
  }
  return picked;
}
