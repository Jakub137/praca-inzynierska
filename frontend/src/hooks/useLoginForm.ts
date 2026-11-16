import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { loginUser } from "@/lib/api/auth";
import { startSession } from "@/lib/auth/session";
import {
  findFirstInvalidLoginField,
  INITIAL_LOGIN_VALUES,
  toLoginErrorMessage,
  toLoginRequest,
  validateLogin,
  type LoginErrors,
  type LoginField,
  type LoginValues,
} from "@/lib/validation/login";

const AFTER_LOGIN_URL = "/dashboard";

type FocusRequest = { readonly field: LoginField };
type FieldRefs = Partial<Record<LoginField, HTMLInputElement | null>>;

export function useLoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>(INITIAL_LOGIN_VALUES);
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
  const errors: LoginErrors = hasSubmitted ? validateLogin(values) : {};

  // Focus moves after the render that shows the error, so aria-describedby is already in place.
  useEffect(() => {
    if (focusRequest) {
      fieldRefs.current[focusRequest.field]?.focus();
    }
  }, [focusRequest]);

  function registerRef(field: LoginField) {
    return (element: HTMLInputElement | null) => {
      fieldRefs.current[field] = element;
    };
  }

  function handleTextChange(field: LoginField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function handleRememberMeChange(event: ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target;
    setValues((current) => ({ ...current, rememberMe: checked }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    setHasSubmitted(true);
    setFormError(undefined);

    const invalidField = findFirstInvalidLoginField(validateLogin(values));
    if (invalidField) {
      setFocusRequest({ field: invalidField });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const auth = await loginUser(toLoginRequest(values));
      startSession(auth, values.rememberMe);
      router.push(AFTER_LOGIN_URL);
    } catch (error) {
      setFormError(toLoginErrorMessage(error));
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
    handleRememberMeChange,
    handleSubmit,
  };
}
