"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RunStallCheckButton from "@/components/reports/RunStallCheckButton";
import type { Project, Report, ProjectStatus } from "@/lib/types";

type ManageProject = Omit<Project, "geom">;

const statusStyle: Record<ProjectStatus, string> = {
  planned: "border-planned text-planned",
  ongoing: "border-ongoing text-ongoing",
  delayed: "border-delayed text-delayed",
  stalled: "border-stalled text-stalled",
  completed: "border-done text-done",
};

const statuses: ProjectStatus[] = ["planned", "ongoing", "delayed", "stalled", "completed"];

const PROJECT_COLUMNS =
  "id,title,type,department,contractor,budget,start_date,end_date,actual_end,status,progress,delay_reason,road_id,created_at,summary_en,summary_ta,delay_draft";

export default function DepartmentManage() {
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [projects, setProjects] = useState<ManageProject[]>([]);
  const [roadNames, setRoadNames] = useState<Record<number, string>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ status: "planned" as ProjectStatus, progress: 0, delay_reason: "" });
  const [message, setMessage] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const stalled = projects.filter((p) => (p.status as string) === "possibly_stalled");

  function pick(p: ManageProject) {
    setSelectedId(p.id);
    setForm({
      status: (p.status ?? "planned") as ProjectStatus,
      progress: p.progress ?? 0,
      delay_reason: p.delay_reason ?? "",
    });
    setMessage("");
  }

  // reload this department's projects after the stall check has run
  async function refreshProjects() {
    if (!departmentName) return;
    const { data } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("department", departmentName)
      .order("id");
    if (data) setProjects(data as ManageProject[]);
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadError("Please log in as a department user.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("department_name")
        .eq("id", user.id)
        .single();
      const dept = profile?.department_name as string | null | undefined;
      if (!dept) {
        setLoadError("This account has no department set.");
        setLoading(false);
        return;
      }
      setDepartmentName(dept);

      const { data: projs, error: projErr } = await supabase
        .from("projects")
        .select(PROJECT_COLUMNS)
        .eq("department", dept)
        .order("id");
      if (projErr) {
        setLoadError("Could not load projects: " + projErr.message);
        setLoading(false);
        return;
      }
      const list = (projs ?? []) as ManageProject[];
      setProjects(list);

      const roadIds = Array.from(
        new Set(list.map((p) => p.road_id).filter((x): x is number => x !== null))
      );
      if (roadIds.length > 0) {
        const { data: roads } = await supabase.from("roads").select("id,name").in("id", roadIds);
        const names: Record<number, string> = {};
        (roads ?? []).forEach((r: { id: number; name: string | null }) => {
          if (r.name) names[r.id] = r.name;
        });
        setRoadNames(names);
      }

      if (list.length > 0) {
        const { data: reps } = await supabase
          .from("reports")
          .select("id,project_id,user_id,message,created_at,status")
          .in("project_id", list.map((p) => p.id))
          .eq("status", "forwarded")
          .order("created_at");
        setReports((reps ?? []) as Report[]);
        pick(list[0]);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!selected) return;
    if (form.status === "delayed" && !form.delay_reason.trim()) {
      setMessage("Add a delay reason before saving a delayed project.");
      return;
    }
    setSaving(true);
    setMessage("");

    const today = new Date().toISOString().slice(0, 10);
    const completed = form.status === "completed";
    const progress = completed ? 100 : form.progress;
    const changes = {
      status: form.status,
      progress,
      delay_reason: form.delay_reason.trim() || null,
      actual_end: completed ? selected.actual_end ?? today : null,
    };

    const { data, error } = await supabase
      .from("projects")
      .update(changes)
      .eq("id", selected.id)
      .select("id");
    setSaving(false);

    if (error) {
      setMessage("Could not save: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setMessage("Not saved. You may not have permission to edit this project.");
      return;
    }
    setProjects((prev) => prev.map((p) => (p.id === selected.id ? { ...p, ...changes } : p)));
    setForm((f) => ({ ...f, progress }));
    setMessage("Saved.");
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
            department: selected.department,
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
        setMessage("AI draft added. Review and edit it, then save.");
        await supabase.from("projects").update({ delay_draft: data.result.text }).eq("id", selected.id);
      } else {
        setMessage("AI is unavailable. Write the reason yourself.");
      }
    } catch {
      setMessage("AI is unavailable. Write the reason yourself.");
    }
    setAiLoading(false);
  }

  async function resolve(id: number) {
    setReportMessage("");
    const { data, error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0) {
      setReportMessage("Could not mark this report resolved. Check your permissions.");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl p-6 text-muted">Loading your projects...</main>;
  }
  if (loadError) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="border-l-4 border-hazard bg-white px-3 py-2 text-sm">{loadError}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-4xl font-bold">{departmentName}: manage projects</h1>
      <p className="mb-4 text-sm text-muted">
        Update status, progress and delay reasons. Residents see these changes on the project pages.
      </p>

      <section className="mb-6 border border-line bg-white p-4">
        <h2 className="mb-1 font-display text-2xl font-semibold">Stall check</h2>
        <p className="mb-3 text-sm text-muted">
          Flags projects where verified resident reports disagree with the official status, or where
          nothing has happened since the start date.
        </p>
        <RunStallCheckButton onDone={refreshProjects} />
        <h3 className="mb-2 mt-4 text-sm font-medium">Possibly stalled ({stalled.length})</h3>
        {stalled.length === 0 ? (
          <p className="text-sm text-muted">No stalled projects.</p>
        ) : (
          <ul className="space-y-2">
            {stalled.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => pick(p)}
                  className="w-full border border-stalled px-3 py-2 text-left text-sm"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted">
                    {p.road_id !== null && roadNames[p.road_id] ? `, ${roadNames[p.road_id]}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {projects.length === 0 ? (
        <p className="border border-line bg-white p-4 text-sm text-muted">
          No projects found for {departmentName}.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold">
              Your projects ({projects.length})
            </h2>
            <ul className="space-y-2">
              {projects.map((p) => {
                const st = (p.status ?? "planned") as ProjectStatus;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => pick(p)}
                      className={`w-full border bg-white p-3 text-left ${
                        selectedId === p.id ? "border-ink" : "border-line"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{p.title}</span>
                        <span className={`border px-2 text-xs ${statusStyle[st] ?? "border-stalled text-stalled"}`}>
                          {String(st).replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {p.road_id !== null && roadNames[p.road_id] ? roadNames[p.road_id] : "Road not linked"}
                        {p.contractor ? `, ${p.contractor}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {p.start_date} to {p.end_date}
                      </p>
                      <div className="mt-2 h-2 w-full bg-ground">
                        <div className="h-2 bg-ink" style={{ width: `${p.progress ?? 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted">{p.progress ?? 0}% complete</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold">Update progress</h2>
            {!selected ? (
              <p className="border border-line bg-white p-4 text-sm text-muted">
                Select a project on the left.
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
                    {(form.status as string) === "possibly_stalled" && (
                      <option value="possibly_stalled">possibly stalled</option>
                    )}
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
                    className="mt-1 block w-full rounded-sm border border-line bg-white px-2 py-2"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-sm bg-ink px-4 py-2 text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
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
      )}

      <section className="mt-8">
        <h2 className="mb-2 font-display text-2xl font-semibold">
          Reports forwarded to you ({reports.length})
        </h2>
        {reportMessage && <p className="mb-2 text-sm text-delayed">{reportMessage}</p>}
        {reports.length === 0 ? (
          <p className="border border-line bg-white p-4 text-sm text-muted">
            No open reports. New resident reports appear here once they are verified and forwarded.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => {
              const proj = projects.find((p) => p.id === r.project_id);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white p-3"
                >
                  <div>
                    <p>{r.message}</p>
                    <p className="text-xs text-muted">
                      {proj?.title}, reported {r.created_at?.slice(0, 10)}
                    </p>
                  </div>
                  <button
                    onClick={() => resolve(r.id)}
                    className="rounded-sm border border-ink px-3 py-1 text-sm"
                  >
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