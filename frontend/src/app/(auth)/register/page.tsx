import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { LogoIcon } from "@/components/icons/LogoIcon";

export const metadata: Metadata = { title: "Rejestracja" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh">
      <BrandPanel />
      <div className="flex w-full items-center justify-center bg-card px-4 py-8 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <LogoIcon className="size-10 text-brand" />
            <p className="text-2xl font-semibold text-ink">Saldo</p>
          </div>
          <h1 className="mt-8 text-3xl font-semibold text-ink">Utwórz konto</h1>
          <p className="mt-2 text-muted">
            Dołącz do nas i zyskaj pełną kontrolę nad budżetem
          </p>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
