"use client";
import { useState } from "react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function Trench({ left, delay }: { left: string; delay: number }) {
  return (
    <div
      className="road-drop absolute inset-y-0 w-[6%] bg-[#0E141B]"
      style={{ left, animationDelay: `${delay}s` }}
    >
      <div className="hazard-stripe absolute inset-y-0 left-0 w-1.5" aria-hidden="true" />
      <div className="hazard-stripe absolute inset-y-0 right-0 w-1.5" aria-hidden="true" />
    </div>
  );
}

export default function RoadStory() {
  const [run, setRun] = useState(0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14">
      <div key={run}>
        <div className="mb-2 grid grid-cols-6 text-xs text-white/60">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div
          role="img"
          aria-label="A road resurfaced in January, then cut open in March and again in May"
          className="relative h-32 overflow-hidden border-y border-white/70 bg-[#2B3745] sm:h-40"
        >
          <div
            className="road-sweep absolute inset-y-0 left-0 w-1/3 bg-white/10"
            style={{ animationDelay: "0.3s" }}
          />
          <div
            className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2"
            style={{
              background:
                "repeating-linear-gradient(90deg, #F5A800 0 28px, transparent 28px 56px)",
            }}
            aria-hidden="true"
          />
          <Trench left="38%" delay={1.9} />
          <Trench left="78%" delay={3.2} />
        </div>

        <ol className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
          <li className="road-fade" style={{ animationDelay: "0.9s" }}>
            <p className="font-display text-xl font-semibold">January</p>
            <p className="text-white/70">Roads resurface the street.</p>
          </li>
          <li className="road-fade" style={{ animationDelay: "2.3s" }}>
            <p className="font-display text-xl font-semibold">March</p>
            <p className="text-white/70">Water Board cuts it open for a pipeline.</p>
            <span
              className="road-stamp mt-2 inline-flex items-stretch bg-white text-xs text-ink"
              style={{ animationDelay: "2.7s" }}
            >
              <span className="hazard-stripe w-2" aria-hidden="true" />
              <span className="px-2 py-1 font-medium">Conflict: one month after resurfacing</span>
            </span>
          </li>
          <li className="road-fade" style={{ animationDelay: "3.6s" }}>
            <p className="font-display text-xl font-semibold">May</p>
            <p className="text-white/70">Drainage cuts it open again.</p>
          </li>
        </ol>

        <p
          className="road-fade mt-8 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl"
          style={{ animationDelay: "4.6s" }}
        >
          A freshly resurfaced road, cut open twice in four months. DigOnce flags the first cut
          before it is scheduled.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs text-white/60">
        <button
          onClick={() => setRun((r) => r + 1)}
          className="rounded-sm border border-white/60 px-3 py-1 text-sm text-white"
        >
          Replay
        </button>
        <span>Sample road with simulated data.</span>
      </div>
    </div>
  );
}