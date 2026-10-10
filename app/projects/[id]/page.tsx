"use client";

import Link from "next/link";

export default function ProjectPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/search" className="text-sm underline">
        Back to the map
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Project Details</h1>
      <p className="mt-2 text-sm text-muted">
        Select a project from the map to view details.
      </p>
    </main>
  );
}