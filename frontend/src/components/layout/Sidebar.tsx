import { LogoIcon } from "@/components/icons/LogoIcon";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { UserCard } from "@/components/layout/UserCard";

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-3">
        <LogoIcon className="size-8 text-brand" />
        <span className="text-xl font-semibold text-ink">Saldo</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <UserCard />
    </div>
  );
}
