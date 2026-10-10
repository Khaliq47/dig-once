"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReportForm from "@/components/reports/ReportForm";

function Inner() {
  const projectId = useSearchParams().get("project") ?? undefined;
  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pb-16">
      <h1 className="text-2xl font-semibold">Report a problem with public works</h1>
      <p className="opacity-75">Add a photo and where it is. Nearby residents can confirm it, and once verified it goes to the department.</p>
      <ReportForm projectId={projectId} />
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="p-4">Loading...</p>}><Inner /></Suspense>;
}
