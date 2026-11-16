"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormInput } from "@/components/ui/FormInput";
import { useLoginForm } from "@/hooks/useLoginForm";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation/registration";

const REGISTERED_MESSAGE = "Konto zostało utworzone. Zaloguj się.";

type LoginFormProps = {
  registered: boolean;
};

export function LoginForm({ registered }: LoginFormProps) {
  const {
    values,
    errors,
    formError,
    isSubmitting,
    registerRef,
    handleTextChange,
    handleRememberMeChange,
    handleSubmit,
  } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6">
      {registered && (
        <div className="mb-4">
          <Alert variant="success">{REGISTERED_MESSAGE}</Alert>
        </div>
      )}
      <div className="space-y-2">
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
          autoComplete="current-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={values.password}
          onChange={handleTextChange("password")}
          error={errors.password}
          ref={registerRef("password")}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-4">
          <Checkbox
            label="Zapamiętaj mnie"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={handleRememberMeChange}
          />
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden"
          >
            Nie pamiętasz hasła?
          </Link>
        </div>
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
        {isSubmitting ? "Logowanie…" : "Zaloguj się"}
      </button>
      <p className="mt-6 text-center text-sm text-muted">
        Nie masz jeszcze konta?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          Zarejestruj się
        </Link>
      </p>
    </form>
  );
}
