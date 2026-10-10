"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { AccountabilityRow } from "@/lib/dummy-accountability";

const metrics = [
  { key: "onTimeRate", label: "On-time rate (%)", higherIsBetter: true },
  { key: "avgDelayDays", label: "Average delay (days)", higherIsBetter: false },
  { key: "repeatDigs", label: "Repeat digs", higherIsBetter: false },
  { key: "verifiedReports", label: "Verified citizen reports", higherIsBetter: false },
] as const;

type MetricKey = (typeof metrics)[number]["key"];

export default function DashboardView({
  departments,
  contractors,
  isSample = false,
}: {
  departments: AccountabilityRow[];
  contractors: AccountabilityRow[];
  isSample?: boolean;
}) {
  const [group, setGroup] = useState<"departments" | "contractors">("departments");
  const [metricKey, setMetricKey] = useState<MetricKey>("onTimeRate");

  const metric = metrics.find((m) => m.key === metricKey)!;
  const rows = group === "departments" ? departments : contractors;

  // best performer first
  const sorted = [...rows].sort((a, b) =>
    metric.higherIsBetter ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-4xl font-bold">Accountability dashboard</h1>
      <p className="mb-4 text-sm text-muted">
        Departments and contractors ranked by delivery, delays and verified citizen feedback.
      </p>

      {isSample && (
        <p className="mb-4 border-l-4 border-hazard bg-white px-3 py-2 text-sm">
          Showing sample data.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["departments", "contractors"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`rounded-sm px-3 py-1 text-sm ${
              group === g ? "bg-ink text-white" : "border border-line bg-white"
            }`}
          >
            {g === "departments" ? "Departments" : "Contractors"}
          </button>
        ))}
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          className="rounded-sm border border-line bg-white px-2 py-1 text-sm"
        >
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="h-80 w-full border border-line bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid stroke="#2E2A25" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#9A9388" tick={{ fill: "#9A9388" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              stroke="#9A9388"
              tick={{ fill: "#ECE6DA" }}
            />
            <Tooltip
              cursor={{ fill: "#2A1F17" }}
              contentStyle={{ background: "#181613", border: "1px solid #2E2A25", color: "#ECE6DA" }}
              labelStyle={{ color: "#ECE6DA" }}
              itemStyle={{ color: "#F5A800" }}
            />
            <Bar dataKey={metricKey} fill="#F5A800" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border border-line bg-white text-left text-sm">
          <thead className="bg-ground">
            <tr>
              <th className="p-2">Rank</th>
              <th className="p-2">Name</th>
              {metrics.map((m) => (
                <th key={m.key} className="p-2">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.name} className="border-t border-line">
                <td className="p-2">{i + 1}</td>
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2">{r.onTimeRate}</td>
                <td className="p-2">{r.avgDelayDays}</td>
                <td className="p-2">{r.repeatDigs}</td>
                <td className="p-2">{r.verifiedReports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}