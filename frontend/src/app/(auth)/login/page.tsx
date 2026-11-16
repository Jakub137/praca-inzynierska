import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";
import { LogoIcon } from "@/components/icons/LogoIcon";

export const metadata: Metadata = { title: "Logowanie" };

const REGISTERED_QUERY_VALUE = "1";

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;

  return (
    <main className="flex min-h-dvh">
      <BrandPanel />
      <div className="flex w-full items-center justify-center bg-card px-4 py-8 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <LogoIcon className="size-10 text-brand" />
            <p className="text-2xl font-semibold text-ink">Saldo</p>
          </div>
          <h1 className="mt-8 text-3xl font-semibold text-ink">
            Witaj ponownie
          </h1>
          <p className="mt-2 text-muted">
            Zaloguj się, aby wrócić do swojego budżetu
          </p>
          <LoginForm registered={registered === REGISTERED_QUERY_VALUE} />
        </div>
      </div>
    </main>
  );
}
