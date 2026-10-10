"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">Loading map...</p>,
});

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-4xl font-bold">Find work near me</h1>
      <p className="mb-4 text-sm text-muted">
        Every public works project on the map. Click a project for details, or allow location to see where you are.
      </p>
      <MapView />
    </main>
  );
}