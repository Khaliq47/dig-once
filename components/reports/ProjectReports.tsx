"use client";
// Drop this into Person 2's project detail page:  <ProjectReports projectId={project.id} />
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import { useSession } from "@/lib/reports/useSession";
import { type Report, REPORT_COLUMNS } from "@/lib/reports/reportStatus";
import ReportCard from "./ReportCard";

export default function ProjectReports({ projectId }: { projectId: string | number }) {
  const { userId } = useSession();
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("reports").select(REPORT_COLUMNS)
      .eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
    setReports((data as unknown as Report[]) ?? []);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resident reports</h2>
        <Link href={`/reports/new?project=${projectId}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Report a problem
        </Link>
      </div>
      {reports === null && <p className="text-slate-500">Loading reports...</p>}
      {reports?.length === 0 && (
        <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
          No reports yet. If you can see this site, add a photo and tell others what is happening.
        </p>
      )}
      {reports?.map((r) => <ReportCard key={r.id} report={r} userId={userId} onChange={load} />)}
    </section>
  );
}
