import { CheckIcon } from "@/components/icons/CheckIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { LogoIcon } from "@/components/icons/LogoIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";

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
    </main>
  );
}
