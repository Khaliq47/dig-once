
"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <p className="p-6">Loading map...</p>,
});

export default function Page() {
  return (
    <main className="p-6">
      <MapView />
    </main>
  );
}