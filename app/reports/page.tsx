"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import { useSession } from "@/lib/reports/useSession";
import { type Report, type ReportStatus, REPORT_COLUMNS, STATUS_STYLE } from "@/lib/reports/reportStatus";
import ReportCard from "@/components/reports/ReportCard";

const FILTERS: { value: "all" | ReportStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Needs confirming" },
  { value: "forwarded", label: STATUS_STYLE.forwarded.label },
  { value: "resolved", label: STATUS_STYLE.resolved.label },
];

export default function ReportsPage() {
  const { userId } = useSession();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");

  const load = useCallback(async () => {
    const { data } = await supabase.from("reports").select(REPORT_COLUMNS)
      .order("created_at", { ascending: false }).limit(60);
    setReports((data as unknown as Report[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = reports?.filter((r) => filter === "all" || r.status === filter);

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Resident reports</h1>
        <Link href="/reports/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Report a problem</Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reports">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {reports === null && <p className="text-slate-500">Loading reports...</p>}
      {shown?.length === 0 && (
        <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
          No reports here yet. Report a problem to start one.
        </p>
      )}
      {shown?.map((r) => <ReportCard key={r.id} report={r} userId={userId} onChange={load} />)}
    </main>
  );
}
