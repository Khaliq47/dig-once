"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProjectReports from "@/components/reports/ProjectReports";

type ProjectRow = {
  id: number;
  title: string;
  type: string;
  department: string;
  contractor: string | null;
  budget: number | null;
  start_date: string;
  end_date: string;
  status: string;
  progress: number | null;
  delay_reason: string | null;
  summary_en: string | null;
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,type,department,contractor,budget,start_date,end_date,status,progress,delay_reason,summary_en")
        .eq("id", Number(params.id))
        .single();
      if (error || !data) setError("Project not found.");
      else setProject(data as ProjectRow);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <main className="mx-auto max-w-4xl p-6 text-muted">Loading project...</main>;
  if (error || !project) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="border-l-4 border-hazard bg-white px-3 py-2 text-sm">{error || "Project not found."}</p>
        <Link href="/search" className="mt-4 inline-block underline">Back to the map</Link>
      </main>
    );
  }

  const rows: [string, string][] = [
    ["Department", project.department],
    ["Contractor", project.contractor ?? "Not assigned"],
    ["Type of work", project.type],
    ["Budget", project.budget ? `Rs ${Number(project.budget).toLocaleString("en-IN")}` : "Not published"],
    ["Timeline", `${project.start_date} to ${project.end_date}`],
    ["Status", String(project.status).replace("_", " ")],
    ["Progress", `${project.progress ?? 0}%`],
  ];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/search" className="text-sm underline">Back to the map</Link>
      <h1 className="mt-2 font-display text-4xl font-bold">{project.title}</h1>

      <dl className="mt-4 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase text-muted">{k}</dt>
            <dd className="text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      {project.delay_reason && (
        <p className="mt-4 border-l-4 border-delayed bg-white px-3 py-2 text-sm">
          <strong>Delay reason:</strong> {project.delay_reason}
        </p>
      )}
      {project.summary_en && <p className="mt-4 text-sm">{project.summary_en}</p>}

      <section className="mt-8">
        <h2 className="mb-2 font-display text-2xl font-semibold">Resident reports</h2>
        <ProjectReports projectId={project.id} />
      </section>
    </main>
  );
}