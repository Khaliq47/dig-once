"use client";
// Demo helper for the department dashboard: runs the stall check on demand.
import { useState } from "react";
import { useSession } from "@/lib/reports/useSession";

export default function RunStallCheckButton({ onDone }: { onDone?: () => void }) {
  const { token } = useSession();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/cron/stall-check", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Check failed");
      const n = json.flagged.length;
      setMsg(n ? `${n} project${n > 1 ? "s" : ""} marked possibly stalled.` : "No new stalled projects found.");
      onDone?.();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy || !token} className="rounded-lg border border-slate-500/50 px-4 py-2 disabled:opacity-60">
        {busy ? "Checking..." : "Run stall check now"}
      </button>
      {msg && <span role="status" className="text-sm opacity-75">{msg}</span>}
    </div>
  );
}
