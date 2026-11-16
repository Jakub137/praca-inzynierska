import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { registerUser } from "@/lib/api/auth";
import { ApiError, getUserMessage } from "@/lib/api/errors";
import {
  findFirstInvalidField,
  INITIAL_REGISTRATION_VALUES,
  toRegisterRequest,
  toServerErrors,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationField,
  type RegistrationValues,
  type TextField,
} from "@/lib/validation/registration";

const LOGIN_AFTER_REGISTRATION_URL = "/login?registered=1";

type FocusRequest = { readonly field: RegistrationField };
type FieldRefs = Partial<Record<RegistrationField, HTMLInputElement | null>>;

function withoutField(
  errors: RegistrationErrors,
  field: RegistrationField,
): RegistrationErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key !== field),
  );
}

export function useRegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegistrationValues>(
    INITIAL_REGISTRATION_VALUES,
  );
  const [serverErrors, setServerErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | undefined>(
    undefined,
  );
  // State updates are asynchronous, so a ref is what blocks a second request in the same tick.
  const isSubmittingRef = useRef(false);
  const fieldRefs = useRef<FieldRefs>({});

  // Errors appear only after the first submit and then follow every change.
  const errors: RegistrationErrors = hasSubmitted
    ? { ...serverErrors, ...validateRegistration(values) }
    : {};

  // Focus moves after the render that shows the error, so aria-describedby is already in place.
  useEffect(() => {
    if (focusRequest) {
      fieldRefs.current[focusRequest.field]?.focus();
    }
  }, [focusRequest]);

  function registerRef(field: RegistrationField) {
    return (element: HTMLInputElement | null) => {
      fieldRefs.current[field] = element;
    };
  }

  function updateValue<F extends RegistrationField>(
    field: F,
    value: RegistrationValues[F],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => withoutField(current, field));
  }

  function handleTextChange(field: TextField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateValue(field, event.target.value);
    };
  }

  function handleTermsChange(event: ChangeEvent<HTMLInputElement>) {
    updateValue("termsAccepted", event.target.checked);
  }

  function showSubmitError(error: unknown) {
    if (error instanceof ApiError) {
      const fieldErrors = toServerErrors(error.status, error.problem);
      const field = findFirstInvalidField(fieldErrors);
      if (field) {
        setServerErrors(fieldErrors);
        setFocusRequest({ field });
        return;
      }
    }
    setFormError(getUserMessage(error));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    setHasSubmitted(true);
    setFormError(undefined);
    setServerErrors({});

    const invalidField = findFirstInvalidField(validateRegistration(values));
    if (invalidField) {
      setFocusRequest({ field: invalidField });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await registerUser(toRegisterRequest(values));
      router.push(LOGIN_AFTER_REGISTRATION_URL);
    } catch (error) {
      showSubmitError(error);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    values,
    errors,
    formError,
    isSubmitting,
    registerRef,
    handleTextChange,
    handleTermsChange,
    handleSubmit,
  };
}
