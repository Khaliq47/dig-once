"use client";
import { useState } from "react";

export default function AiTest() {
  const [out, setOut] = useState("Click a button to test.");

  async function run(kind: string, extra: object = {}) {
    setOut("Loading...");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        project: {
          title: "Water pipeline on Station Road",
          department: "Water Board",
          purpose: "Replace old drinking water pipeline",
          start_date: "2026-11-03",
          end_date: "2026-11-20",
          status: "planned",
          ...extra,
        },
        reports:
          kind === "report_summary"
            ? ["Work has stopped for a week", "No barricades at night"]
            : undefined,
      }),
    });
    setOut(JSON.stringify(await res.json(), null, 2));
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-bold">AI test (temporary)</h1>
      <div className="my-4 flex flex-wrap gap-2">
        <button className="rounded-sm bg-ink px-3 py-2 text-white" onClick={() => run("notice_summary")}>
          Notice summary
        </button>
        <button
          className="rounded-sm bg-ink px-3 py-2 text-white"
          onClick={() => run("delay_draft", { status: "delayed", delay_reason: "Heavy rain" })}
        >
          Delay draft
        </button>
        <button className="rounded-sm bg-ink px-3 py-2 text-white" onClick={() => run("report_summary")}>
          Report summary
        </button>
      </div>
      <pre className="whitespace-pre-wrap border border-line bg-white p-3 text-sm">{out}</pre>
    </main>
  );
}