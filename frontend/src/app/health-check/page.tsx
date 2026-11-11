import type { Metadata } from "next";
import { connection } from "next/server";

import { getUserMessage } from "@/lib/api/errors";
import { getHealth } from "@/lib/api/health";
import type { HealthResponse } from "@/types/api";

export const metadata: Metadata = { title: "Test połączenia" };

type HealthResult =
  | { readonly ok: true; readonly health: HealthResponse }
  | { readonly ok: false; readonly message: string };

async function loadHealth(): Promise<HealthResult> {
  try {
    return { ok: true, health: await getHealth() };
  } catch (error) {
    return { ok: false, message: getUserMessage(error) };
  }
}

export default async function HealthCheckPage() {
  await connection();
  const result = await loadHealth();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-ink">Test połączenia</h1>
      {result.ok ? (
        <p role="status" className="mt-4 text-success">
          Połączono z serwerem. Status: {result.health.status} (
          {result.health.timestamp}).
        </p>
      ) : (
        <p role="alert" className="mt-4 text-danger">
          {result.message}
        </p>
      )}
    </main>
  );
}
