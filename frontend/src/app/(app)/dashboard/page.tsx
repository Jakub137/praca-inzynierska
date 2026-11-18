import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strona Główna",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Strona Główna</h1>
      <p className="mt-2 text-muted">
        Wkrótce pojawią się tu podsumowanie budżetu i ostatnie transakcje.
      </p>
    </div>
  );
}
