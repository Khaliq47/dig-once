"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";

type Props = {
  id: number;
  title: string;
  department: string;
  contractor: string | null;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
};

type Feature = {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: Props;
};

const STATUS_COLOR: Record<string, string> = {
  planned: "#2563eb",
  ongoing: "#f59e0b",
  delayed: "#dc2626",
  completed: "#16a34a",
  possibly_stalled: "#9333ea",
};

const STATUS_OPTIONS = ["all", "planned", "ongoing", "delayed", "completed", "possibly_stalled"];

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState("");

  // Create the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([13.0827, 80.2707], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup("You are here.");
          setGps("Blue dot: your location.");
        },
        () => setGps("Location not shared. Allow location access to see where you are."),
        { timeout: 10000 }
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Load projects from database
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc("projects_geojson");
      if (error) {
        setError("Could not load projects: " + error.message);
      } else {
        setFeatures(((data as { features?: Feature[] })?.features ?? []) as Feature[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Draw projects ALWAYS as dots (CircleMarkers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const shown = features.filter((f) => filter === "all" || f.properties.status === filter);
    if (shown.length === 0) return;

    const group = L.layerGroup();

    shown.forEach((f) => {
      // Calculate center point whether geometry is Point, LineString, or Polygon
      const tempGeo = L.geoJSON(f as unknown as GeoJSON.Feature);
      const bounds = tempGeo.getBounds();
      if (!bounds.isValid()) return;

      const center = bounds.getCenter();
      const p = f.properties;
      const color = STATUS_COLOR[p.status ?? ""] ?? "#6b7280";

      const marker = L.circleMarker(center, {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });

      marker.bindPopup(
        `<strong>${esc(p.title)}</strong><br/>` +
          `${esc(p.department)}${p.contractor ? ", " + esc(p.contractor) : ""}<br/>` +
          `${esc(p.start_date)} to ${esc(p.end_date)}<br/>` +
          `Status: ${esc(String(p.status).replace("_", " "))}<br/>` +
          `<a href="/projects/${esc(p.id)}" style="text-decoration:underline">View project details</a>`
      );

      group.addLayer(marker);
    });

    group.addTo(map);
    layerRef.current = group;

    // Fit view to project dots
    const allMarkers = group.getLayers();
    if (allMarkers.length > 0) {
      const featureGroup = L.featureGroup(allMarkers);
      const bounds = featureGroup.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }, [features, filter]);

  const count = features.filter((f) => filter === "all" || f.properties.status === filter).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label>
          Status{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-sm border border-line bg-white px-2 py-1"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted">{loading ? "Loading projects..." : `${count} projects shown`}</span>
        <span className="flex flex-wrap gap-3 text-xs text-muted">
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1">
              <span style={{ background: c }} className="inline-block h-3 w-3 rounded-full" />
              {s.replace("_", " ")}
            </span>
          ))}
        </span>
      </div>

      {error && <p className="border-l-4 border-delayed bg-white px-3 py-2 text-sm text-delayed">{error}</p>}
      {gps && <p className="text-xs text-muted">{gps}</p>}

      <div ref={containerRef} className="h-[65vh] min-h-[400px] w-full overflow-hidden border border-line" />
    </section>
  );
}