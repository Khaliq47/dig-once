import { Suspense } from "react";
import { connection } from "next/server";
import DashboardView from "@/components/DashboardView";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { AccountabilityRow } from "@/lib/accountability";

type DbRow = {
  name: string;
  on_time_rate: number;
  avg_delay_days: number;
  repeat_digs: number;
  verified_reports: number;
};

function toRow(r: DbRow): AccountabilityRow {
  return {
    name: r.name,
    onTimeRate: r.on_time_rate,
    avgDelayDays: r.avg_delay_days,
    repeatDigs: r.repeat_digs,
    verifiedReports: r.verified_reports,
  };
}

async function DashboardData() {
  await connection();
  const supabase = await createSupabaseServer();
  const [depts, contractors] = await Promise.all([
    supabase.from("accountability_departments").select("*"),
    supabase.from("accountability_contractors").select("*"),
  ]);

  if (depts.error || contractors.error) {
    console.error("Accountability departments error:", depts.error);
    console.error("Accountability contractors error:", contractors.error);
    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="font-display text-4xl font-bold">Accountability dashboard</h1>
        <p className="mt-4 border-l-4 border-hazard bg-white px-3 py-2 text-sm">
          The rankings could not be loaded right now. Please try again in a moment.
        </p>
      </main>
    );
  }

  return (
    <DashboardView
      departments={((depts.data ?? []) as DbRow[]).map(toRow)}
      contractors={((contractors.data ?? []) as DbRow[]).map(toRow)}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl p-6 text-muted">Loading rankings...</main>}>
      <DashboardData />
    </Suspense>
  );
}