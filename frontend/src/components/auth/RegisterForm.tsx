"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { FormInput } from "@/components/ui/FormInput";

const NAME_MAX_LENGTH = 60;
const EMAIL_MAX_LENGTH = 150;
const PASSWORD_HINT =
  "Min. 8 znaków, 1 wielka litera, 1 cyfra, 1 znak specjalny (np. !, @, #, $).";

// TODO(T-025): replace with validation and POST /api/v1/auth/register.
// Until then the submit must not trigger a native GET that puts the password in the URL.
function preventNativeSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

export function RegisterForm() {
  return (
    <form onSubmit={preventNativeSubmit} className="mt-6">
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormInput
            label="Imię"
            name="firstName"
            autoComplete="given-name"
            maxLength={NAME_MAX_LENGTH}
          />
          <FormInput
            label="Nazwisko"
            name="lastName"
            autoComplete="family-name"
            maxLength={NAME_MAX_LENGTH}
          />
        </div>
        <FormInput
          label="Adres e-mail"
          type="email"
          name="email"
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
        />
        <FormInput
          label="Hasło"
          type="password"
          name="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
        />
        <FormInput
          label="Powtórz hasło"
          type="password"
          name="passwordConfirmation"
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        className="mt-4 h-11 w-full rounded-lg bg-brand px-4 text-base font-semibold text-white hover:brightness-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden"
      >
        Zarejestruj się
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
