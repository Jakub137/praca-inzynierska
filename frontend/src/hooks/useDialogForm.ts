import { type FormEvent, type RefObject, useRef, useState } from "react";
import { ApiError, getUserMessage } from "@/lib/api/errors";
import type { FieldMessages, FormParseResult } from "@/lib/forms/fieldErrors";
import type { FieldError } from "@/types/api";

const HTTP_BAD_REQUEST = 400;

type FieldValues<Field extends string> = Readonly<Record<Field, string>>;

type UseDialogFormOptions<Field extends string, Request> = {
  initialValues: FieldValues<Field>;
  // Order of the fields in the form: the first invalid one gets the focus.
  fields: readonly Field[];
  refs: Readonly<Record<Field, RefObject<HTMLInputElement | null>>>;
  parse: (values: FieldValues<Field>) => FormParseResult<Field, Request>;
  mapServerErrors: (
    fieldErrors: readonly FieldError[] | undefined,
  ) => FieldMessages<Field>;
  // Rejects with the failure; its user message is shown in the dialog.
  onSubmit: (request: Request) => Promise<void>;
};

export type DialogFormState<Field extends string> = {
  readonly values: FieldValues<Field>;
  readonly errors: FieldMessages<Field>;
  readonly isSubmitting: boolean;
  // Message of the last failed request that is not tied to a field; null when there is none.
  readonly submitError: string | null;
  readonly setField: (field: Field, value: string) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function withoutError<Field extends string>(
  errors: FieldMessages<Field>,
  field: Field,
): FieldMessages<Field> {
  const next: { [F in Field]?: string } = { ...errors };
  delete next[field];
  return next;
}

export function useDialogForm<Field extends string, Request>({
  initialValues,
  fields,
  refs,
  parse,
  mapServerErrors,
  onSubmit,
}: UseDialogFormOptions<Field, Request>): DialogFormState<Field> {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldMessages<Field>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The state drives the button; the ref also blocks a second submit event that arrives before the re-render.
  const isSendingRef = useRef(false);

  // Editing a field removes its message and the failure message; the other field messages stay until the next submit.
  function setField(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => withoutError(current, field));
    setSubmitError(null);
  }

  function findFirstInvalid(invalid: FieldMessages<Field>): Field | undefined {
    return fields.find((field) => invalid[field] !== undefined);
  }

  // 400 with errors of our fields goes to the fields; every other failure (404, 5xx, network) to the dialog.
  function showFailure(error: unknown) {
    const serverErrors: FieldMessages<Field> =
      error instanceof ApiError && error.status === HTTP_BAD_REQUEST
        ? mapServerErrors(error.problem?.fieldErrors)
        : {};
    const firstInvalid = findFirstInvalid(serverErrors);
    if (firstInvalid === undefined) {
      setSubmitError(getUserMessage(error));
      return;
    }
    setErrors(serverErrors);
    refs[firstInvalid].current?.focus();
  }

  async function send(request: Request) {
    isSendingRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(request);
    } catch (error) {
      showFailure(error);
    } finally {
      isSendingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSendingRef.current) {
      return;
    }
    const result = parse(values);
    if (result.status === "invalid") {
      setErrors(result.errors);
      const firstInvalid = findFirstInvalid(result.errors);
      if (firstInvalid !== undefined) {
        refs[firstInvalid].current?.focus();
      }
      return;
    }
    setErrors({});
    void send(result.request);
  }

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    setField,
    handleSubmit,
  };
}
