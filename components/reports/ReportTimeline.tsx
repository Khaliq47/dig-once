"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import { STATUS_STYLE, timeAgo, type ReportEvent, type ReportStatus } from "@/lib/reports/reportStatus";

export default function ReportTimeline({ reportId, refreshKey = 0 }: { reportId: string; refreshKey?: number }) {
  const [events, setEvents] = useState<ReportEvent[] | null>(null);

  useEffect(() => {
    supabase.from("report_events").select("id,status,note,created_at")
      .eq("report_id", reportId).order("created_at").order("id")
      .then(({ data }) => setEvents((data as ReportEvent[]) ?? []));
  }, [reportId, refreshKey]);

  if (!events) return <p className="text-sm text-slate-500">Loading progress...</p>;
  if (events.length === 0) return <p className="text-sm text-slate-500">No updates yet.</p>;

  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-5">
      {events.map((e) => {
        const s = STATUS_STYLE[e.status as ReportStatus];
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white" />
            <p className="font-medium">{s?.label ?? e.status}</p>
            {e.note && <p className="text-sm text-slate-600">{e.note}</p>}
            <p className="text-xs text-slate-400">{timeAgo(e.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
