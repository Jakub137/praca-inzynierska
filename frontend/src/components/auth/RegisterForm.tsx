"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormInput } from "@/components/ui/FormInput";
import { useRegisterForm } from "@/hooks/useRegisterForm";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation/registration";

const PASSWORD_HINT =
  "Min. 8 znaków, 1 wielka litera, 1 cyfra, 1 znak specjalny (np. !, @, #, $).";
const TERMS_LABEL = "Akceptuję Regulamin i Politykę prywatności";

export function RegisterForm() {
  const {
    values,
    errors,
    formError,
    isSubmitting,
    registerRef,
    handleTextChange,
    handleTermsChange,
    handleSubmit,
  } = useRegisterForm();

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormInput
            label="Imię"
            name="firstName"
            autoComplete="given-name"
            maxLength={NAME_MAX_LENGTH}
            value={values.firstName}
            onChange={handleTextChange("firstName")}
            error={errors.firstName}
            ref={registerRef("firstName")}
          />
          <FormInput
            label="Nazwisko"
            name="lastName"
            autoComplete="family-name"
            maxLength={NAME_MAX_LENGTH}
            value={values.lastName}
            onChange={handleTextChange("lastName")}
            error={errors.lastName}
            ref={registerRef("lastName")}
          />
        </div>
        <FormInput
          label="Adres e-mail"
          type="email"
          name="email"
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
          value={values.email}
          onChange={handleTextChange("email")}
          error={errors.email}
          ref={registerRef("email")}
        />
        <FormInput
          label="Hasło"
          type="password"
          name="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          hint={PASSWORD_HINT}
          value={values.password}
          onChange={handleTextChange("password")}
          error={errors.password}
          ref={registerRef("password")}
        />
        <FormInput
          label="Powtórz hasło"
          type="password"
          name="passwordConfirmation"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={values.passwordConfirmation}
          onChange={handleTextChange("passwordConfirmation")}
          error={errors.passwordConfirmation}
          ref={registerRef("passwordConfirmation")}
        />
        <Checkbox
          label={TERMS_LABEL}
          name="termsAccepted"
          checked={values.termsAccepted}
          onChange={handleTermsChange}
          error={errors.termsAccepted}
          ref={registerRef("termsAccepted")}
        />
      </div>
      {formError && (
        <div className="mt-4">
          <Alert variant="error">{formError}</Alert>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 h-11 w-full rounded-lg bg-brand px-4 text-base font-semibold text-white hover:brightness-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Rejestracja…" : "Zarejestruj się"}
      </button>
      <p className="mt-6 text-center text-sm text-muted">
        Masz już konto?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
