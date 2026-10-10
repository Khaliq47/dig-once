"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import type { Report } from "@/lib/reports/reportStatus";

type Vote = "confirm" | "dispute" | null;

export default function VoteButtons({
  report, userId, onVoted,
}: { report: Report; userId: string | null; onVoted: () => void }) {
  const [mine, setMine] = useState<Vote>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase.from("report_votes").select("vote").eq("report_id", report.id).eq("user_id", userId)
      .maybeSingle().then(({ data }) => setMine((data?.vote as Vote) ?? null));
  }, [report.id, userId]);

  if (!userId) return <p className="text-sm text-slate-500">Log in to confirm or dispute this report.</p>;
  if (report.user_id === userId) return <p className="text-sm text-slate-500">You submitted this report.</p>;
  if (report.status !== "submitted") return <p className="text-sm text-slate-500">Voting is closed for this report.</p>;

  async function vote(v: "confirm" | "dispute") {
    setBusy(true); setError("");
    const q = mine === v
      ? supabase.from("report_votes").delete().eq("report_id", report.id).eq("user_id", userId!)   // tap again to undo
      : supabase.from("report_votes").upsert({ report_id: report.id, user_id: userId, vote: v },
          { onConflict: "report_id,user_id" });
    const { error: err } = await q;
    setBusy(false);
    if (err) return setError(err.message);
    setMine(mine === v ? null : v);
    onVoted();
  }

  const base = "flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60";
  return (
    <div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => vote("confirm")} aria-pressed={mine === "confirm"}
          className={`${base} ${mine === "confirm" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
          I see this too ({report.confirm_count})
        </button>
        <button disabled={busy} onClick={() => vote("dispute")} aria-pressed={mine === "dispute"}
          className={`${base} ${mine === "dispute" ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300"}`}>
          This is wrong ({report.dispute_count})
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
