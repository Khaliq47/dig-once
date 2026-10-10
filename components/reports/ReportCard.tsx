"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import {
  type Report, REPORT_COLUMNS, STATUS_STYLE, AI_LABELS, CATEGORIES, VERIFY_THRESHOLD, photoUrl, timeAgo,
} from "@/lib/reports/reportStatus";
import VoteButtons from "./VoteButtons";
import ReportTimeline from "./ReportTimeline";

export default function ReportCard({
  report, userId, startOpen = false, onChange,
}: { report: Report; userId: string | null; startOpen?: boolean; onChange?: () => void }) {
  const [r, setR] = useState(report);
  const [open, setOpen] = useState(startOpen);
  const [tick, setTick] = useState(0);
  useEffect(() => setR(report), [report]);

  async function refresh() {
    const { data } = await supabase.from("reports").select(REPORT_COLUMNS).eq("id", r.id).single();
    if (data) setR(data as unknown as Report);
    setTick((t) => t + 1);
    onChange?.();
  }

  const s = STATUS_STYLE[r.status];
  const img = photoUrl(r.photo_path);
  const label = CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category;
  const pct = Math.min(100, Math.max(0, (r.trust_score / VERIFY_THRESHOLD) * 100));

  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{label}</h3>
          <p className="text-xs text-slate-500">{timeAgo(r.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs ring-1 ${s.cls}`}>{s.label}</span>
      </div>

      {img && <img src={img} alt={`Photo for report: ${label}`} loading="lazy"
        className="max-h-64 w-full rounded-lg object-cover" />}

      {r.note && <p className="text-slate-700">{r.note}</p>}

      <div className="flex flex-wrap gap-2 text-xs">
        {r.ai_status === "classified" && r.ai_category && (
          <span className="rounded bg-slate-100 px-2 py-1">Photo looks like: {AI_LABELS[r.ai_category]}</span>
        )}
        {r.ai_status === "unclassified" && r.photo_path && (
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-500">Photo not classified</span>
        )}
        {r.duplicate_of && (
          <Link href={`/reports/${r.duplicate_of}`} className="rounded bg-amber-50 px-2 py-1 text-amber-800 underline">
            Similar report nearby
          </Link>
        )}
      </div>

      {r.status === "submitted" && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Needs more confirmations to be verified</span><span>{Math.max(0, r.trust_score)}/{VERIFY_THRESHOLD}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(pct)}
            aria-valuemin={0} aria-valuemax={100} aria-label="Verification progress">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {r.status === "flagged" && (
        <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          Reported {Math.round(r.distance_to_project_m ?? 0)} m from the project, so it cannot be verified.
        </p>
      )}

      <VoteButtons report={r} userId={userId} onVoted={refresh} />

      <button className="text-sm underline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide progress" : "Show progress"}
      </button>
      {open && <ReportTimeline reportId={r.id} refreshKey={tick} />}
    </article>
  );
}
