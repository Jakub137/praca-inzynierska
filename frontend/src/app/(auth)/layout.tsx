import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BrandPanel } from "@/components/auth/BrandPanel";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <AuthShell panel={<BrandPanel />}>{children}</AuthShell>;
}
