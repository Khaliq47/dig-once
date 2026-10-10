"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import { useSession } from "@/lib/reports/useSession";
import { type Report, REPORT_COLUMNS } from "@/lib/reports/reportStatus";
import ReportCard from "@/components/reports/ReportCard";

function ReportInner() {
  const { id } = useParams<{ id: string }>();
  const { userId, loading } = useSession();
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    if (loading) return;
    supabase.from("reports").select(REPORT_COLUMNS).eq("id", id).maybeSingle().then(({ data }) => {
      if (data) { setReport(data as unknown as Report); setState("ok"); } else setState("missing");
    });
  }, [id, loading]);

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-16">
      {state === "loading" && <p className="opacity-60">Loading report...</p>}
      {state === "missing" && <p className="rounded-lg bg-slate-500/10 p-4">This report does not exist, or you do not have access to it.</p>}
      {state === "ok" && report && (
        <>
          {/* assumes Person 2's route is /projects/[id] */}
          <Link href={`/projects/${report.project_id}`} className="text-sm underline">Back to the project</Link>
          <ReportCard report={report} userId={userId} startOpen />
        </>
      )}
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<p className="p-4 opacity-60">Loading report...</p>}>
      <ReportInner />
    </Suspense>
  );
}
