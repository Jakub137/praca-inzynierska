import { CheckIcon } from "@/components/icons/CheckIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { LogoIcon } from "@/components/icons/LogoIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { FormInput } from "@/components/ui/FormInput";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold text-brand">Saldo</h1>
      <p className="mt-2 text-muted">
        Aplikacja do zarządzania budżetem domowym.
      </p>
      <div className="mt-6 flex items-center gap-4 text-muted">
        <LogoIcon className="size-12 text-brand" />
        <EyeIcon className="size-6" />
        <PencilIcon className="size-6" />
        <TrashIcon className="size-6" />
        <SearchIcon className="size-6" />
        <ChevronDownIcon className="size-6" />
        <CheckIcon className="size-6" />
      </div>
      <section aria-labelledby="form-input-preview" className="mt-10 max-w-md">
        <h2 id="form-input-preview" className="text-xl font-semibold">
          Podgląd FormInput (tymczasowy, T-023)
        </h2>
        <div className="mt-4 space-y-2">
          <FormInput label="Imię" name="firstName" autoComplete="given-name" />
          <FormInput
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
          />
          <FormInput
            label="Hasło"
            type="password"
            name="password"
            autoComplete="new-password"
          />
          <FormInput
            label="Powtórz hasło"
            type="password"
            name="passwordConfirmation"
            autoComplete="new-password"
          />
          <FormInput
            label="E-mail z błędem"
            type="email"
            name="emailWithError"
            defaultValue="jan"
            error="Podaj adres e-mail w formacie jan@example.com."
          />
          <FormInput
            label="Pole wyłączone"
            disabled
            defaultValue="Nieaktywne"
          />
        </div>
      </section>
    </main>
  );
}
