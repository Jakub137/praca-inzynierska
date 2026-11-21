import type { Metadata } from "next";
import { GoalsView } from "@/components/goals/GoalsView";

export const metadata: Metadata = {
  title: "Cele Oszczędnościowe",
};

export default function GoalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Cele Oszczędnościowe</h1>
      <GoalsView />
    </div>
  );
}
