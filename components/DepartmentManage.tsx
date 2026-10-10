"use client";
import { useState } from "react";
import {
  projectsDummy, reportsDummy,
  type DeptProject, type DeptReport, type ProjectStatus,
} from "@/lib/dummy-department";

const statusStyle: Record<ProjectStatus, string> = {
  planned: "border-planned text-planned",
  ongoing: "border-ongoing text-ongoing",
  delayed: "border-delayed text-delayed",
  stalled: "border-stalled text-stalled",
  completed: "border-done text-done",
};

const statuses: ProjectStatus[] = ["planned", "ongoing", "delayed", "stalled", "completed"];

export default function DepartmentManage({ departmentName = "Water Board" }: { departmentName?: string }) {
  const [projects, setProjects] = useState<DeptProject[]>(projectsDummy);
  const [reports, setReports] = useState<DeptReport[]>(reportsDummy);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ status: "planned" as ProjectStatus, progress: 0, delay_reason: "" });
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const forwarded = reports.filter((r) => r.status === "forwarded");

  function select(p: DeptProject) {
    setSelectedId(p.id);
    setForm({ status: p.status, progress: p.progress, delay_reason: p.delay_reason });
    setMessage("");
  }

  function save() {
    if (!selected) return;
    if (form.status === "delayed" && !form.delay_reason.trim()) {
      setMessage("Add a delay reason before saving a delayed project.");
      return;
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? { ...p, status: form.status, progress: form.progress, delay_reason: form.delay_reason }
          : p
      )
    );
    setMessage("Saved. This is sample data and is not stored yet.");
  }

  async function draftWithAi() {
    if (!selected) return;
    setAiLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "delay_draft",
          project: {
            title: selected.title,
            department: departmentName,
            contractor: selected.contractor,
            start_date: selected.start_date,
            end_date: selected.end_date,
            status: form.status,
            delay_reason: form.delay_reason,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.result?.text) {
        setForm((f) => ({ ...f, delay_reason: data.result.text }));
        setMessage("AI draft added. Review and edit it before saving.");
      } else {
        setMessage("AI is unavailable. Write the reason yourself.");
      }
    } catch {
      setMessage("AI is unavailable. Write the reason yourself.");
    }
    setAiLoading(false);
  }

  function resolve(id: string) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-4xl font-bold">{departmentName}: manage projects</h1>
      <p className="mb-4 border-l-4 border-hazard bg-white px-3 py-2 text-sm">Showing sample data.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-2xl font-semibold">Your projects</h2>
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => select(p)}
                  className={`w-full border bg-white p-3 text-left ${
                    selectedId === p.id ? "border-ink" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{p.title}</span>
                    <span className={`border px-2 text-xs ${statusStyle[p.status]}`}>{p.status}</span>
                  </div>
                  <p className="text-sm text-muted">{p.road}, {p.contractor}</p>
                  <div className="mt-2 h-2 w-full bg-ground">
                    <div className="h-2 bg-ink" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{p.progress}% complete</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-2xl font-semibold">Update progress</h2>
          {!selected ? (
            <p className="border border-line bg-white p-4 text-sm text-muted">
              Select a project on the left to update its status, progress and delay reason.
            </p>
          ) : (
            <div className="space-y-3 border border-line bg-white p-4">
              <p className="font-medium">{selected.title}</p>

              <label className="block text-sm">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  className="mt-1 block w-full rounded-sm border border-line bg-white px-2 py-2"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                Progress: {form.progress}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                  className="mt-1 block w-full"
                />
              </label>

              <label className="block text-sm">
                Delay reason (shown to residents)
                <textarea
                  value={form.delay_reason}
                  onChange={(e) => setForm({ ...form, delay_reason: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-sm border border-line px-2 py-2"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button onClick={save} className="rounded-sm bg-ink px-4 py-2 text-white">
                  Save changes
                </button>
                <button
                  onClick={draftWithAi}
                  disabled={aiLoading}
                  className="rounded-sm border border-ink px-4 py-2 disabled:opacity-50"
                >
                  {aiLoading ? "Drafting..." : "Draft reason with AI"}
                </button>
              </div>
              {message && <p className="text-sm">{message}</p>}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-2xl font-semibold">
          Reports forwarded to you ({forwarded.length})
        </h2>
        {forwarded.length === 0 ? (
          <p className="border border-line bg-white p-4 text-sm text-muted">
            No open reports. New resident reports appear here once they are verified and forwarded.
          </p>
        ) : (
          <ul className="space-y-2">
            {forwarded.map((r) => {
              const proj = projects.find((p) => p.id === r.project_id);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white p-3">
                  <div>
                    <p>{r.text}</p>
                    <p className="text-xs text-muted">{proj?.title}, reported {r.created}</p>
                  </div>
                  <button onClick={() => resolve(r.id)} className="rounded-sm border border-ink px-3 py-1 text-sm">
                    Mark resolved
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}