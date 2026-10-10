"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/reports/client";
import { useSession } from "@/lib/reports/useSession";
import { CATEGORIES, AI_LABELS, STATUS_STYLE, type Report } from "@/lib/reports/reportStatus";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-slate-500/100/20" />,
});

type Loc = { lat: number; lng: number; source: "exif" | "browser" | "manual" };
type Project = { id: number | string; title: string; center?: [number, number]; geometry?: any };

// middle point of any GeoJSON geometry, as [lat, lng]
function midpoint(g: any): [number, number] | undefined {
  const pts: number[][] = [];
  const walk = (c: any) => {
    if (typeof c?.[0] === "number") pts.push(c);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(g?.coordinates);
  if (!pts.length) return undefined;
  const p = pts[Math.floor(pts.length / 2)];
  return [p[1], p[0]];
}

const SOURCE_TEXT: Record<Loc["source"], string> = {
  exif: "Location read from the photo",
  browser: "Using your current location",
  manual: "Pin placed on the map",
};

export default function ReportForm({ projectId }: { projectId?: string }) {
  const { userId, token, loading } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState(projectId ?? "");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Report | null>(null);

  useEffect(() => {
    // Dakshin's projects_geojson() gives every project with its geometry.
    supabase.rpc("projects_geojson").then(async ({ data, error }) => {
      if (!error && data?.features?.length) {
        const list: Project[] = data.features.map((f: any) => ({
          id: f.properties.id, title: f.properties.title,
          geometry: f.geometry, center: midpoint(f.geometry),
        }));
        list.sort((x, y) => x.title.localeCompare(y.title));
        setProjects(list);
      } else {
        const { data: rows } = await supabase.from("projects").select("id,title").order("title").limit(200);
        setProjects((rows as Project[]) ?? []);
      }
    });
  }, []);

  const selected = projects.find((p) => String(p.id) === String(project));

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onFile(f: File | null) {
    setFile(f); setError(""); setLocMsg("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (!f) return;
    try {
      // Read EXIF from the ORIGINAL file. Compressing later strips it.
      const exifr = (await import("exifr")).default;
      const gps = await exifr.gps(f);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        setLoc({ lat: gps.latitude, lng: gps.longitude, source: "exif" });
        return;
      }
    } catch { /* unreadable EXIF: fall through */ }
    setLocMsg("This photo has no location. Use your current location or tap the map.");
  }

  function useMyLocation() {
    setLocMsg("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, source: "browser" }); setLocMsg(""); },
      () => setLocMsg("Location is blocked. Tap the map to place a pin instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!userId || !token) return setError("Log in to submit a report.");
    if (!project) return setError("Choose the project this is about.");
    if (!category) return setError("Choose what is wrong.");
    if (!loc) return setError("Add a location: use a photo with location, your current location, or tap the map.");

    setBusy(true);
    try {
      let photo_path: string | null = null;
      if (file) {
        let upload: File | Blob = file;
        try {
          const { default: compress } = await import("browser-image-compression");
          upload = await compress(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true });
        } catch { /* e.g. HEIC the browser cannot decode: upload the original */ }
        const ext = (upload.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        photo_path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("report-photos")
          .upload(photo_path, upload, { contentType: upload.type || "image/jpeg" });
        if (up.error) throw new Error("Photo upload failed. Check your connection and try again.");
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: project, category, note: note.trim() || null,
          lat: loc.lat, lng: loc.lng, location_source: loc.source, photo_path,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit the report.");
      setResult(json as Report);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-4 opacity-60">Loading...</p>;
  if (!userId) return <p className="rounded-lg bg-amber-50 p-4 text-amber-900">Log in to report a problem.</p>;

  if (result) {
    const flagged = result.status === "flagged";
    return (
      <div className="space-y-3 rounded-xl border border-slate-500/30 bg-slate-500/10 p-5" role="status">
        <span className={`inline-block rounded-full px-3 py-1 text-sm ring-1 ${STATUS_STYLE[result.status].cls}`}>
          {STATUS_STYLE[result.status].label}
        </span>
        {flagged ? (
          <p>Your location is {Math.round(result.distance_to_project_m ?? 0)} m from this project, so the report was not
            accepted. Go to the site, or move the pin closer, and submit again.</p>
        ) : (
          <p>Report submitted. Other residents nearby can now confirm it. It becomes verified once enough people agree.</p>
        )}
        {result.duplicate_of && (
          <p className="text-sm opacity-75">Someone already reported something similar here.{" "}
            <Link className="underline" href={`/reports/${result.duplicate_of}`}>Confirm theirs</Link> to help it get verified faster.</p>
        )}
        {result.ai_status === "classified" && result.ai_category && (
          <p className="text-sm opacity-75">Photo looks like: {AI_LABELS[result.ai_category]}</p>
        )}
        <div className="flex gap-3 pt-1">
          <Link className="rounded-lg bg-blue-600 px-4 py-2 text-white" href={`/reports/${result.id}`}>Track this report</Link>
          <button className="rounded-lg border border-slate-500/50 px-4 py-2"
            onClick={() => { setResult(null); setFile(null); setPreview(null); setNote(""); setCategory(""); setLoc(null); }}>
            Report another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!projectId && (
        <label className="block">
          <span className="mb-1 block font-medium">Project</span>
          <select className="w-full rounded-lg border border-slate-500/50 !bg-slate-800 p-2.5 !text-white" value={project}
            onChange={(e) => setProject(e.target.value)} required>
            <option className="!bg-slate-900 !text-yellow-500" value="">Choose a project</option>
            {projects.map((p) => <option className="!bg-slate-900 !text-yellow-500" key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1 block font-medium">What is wrong?</span>
        <select className="w-full rounded-lg border border-slate-500/50 !bg-slate-800 p-2.5 !text-white" value={category}
          onChange={(e) => setCategory(e.target.value)} required>
          <option className="!bg-slate-900 !text-yellow-500" value="">Choose one</option>
          {CATEGORIES.map((c) => <option className="!bg-slate-900 !text-yellow-500" key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>

      <div>
        <span className="mb-1 block font-medium">Photo <span className="font-normal opacity-60">(recommended)</span></span>
        <input type="file" accept="image/*" capture="environment"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white" />
        {preview && <img src={preview} alt="Selected photo" className="mt-3 max-h-56 rounded-lg object-cover" />}
      </div>

      <div>
        <span className="mb-1 block font-medium">Location</span>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={useMyLocation} className="rounded-lg border border-slate-500/50 px-3 py-1.5">
            Use my current location
          </button>
          {loc && <span className="text-emerald-500">{SOURCE_TEXT[loc.source]}</span>}
          {locMsg && <span className="text-amber-500">{locMsg}</span>}
        </div>
        {selected?.geometry && (
          <p className="mb-2 text-sm opacity-75">The blue line is the work site. Tap the map close to it (within 150 m) where the problem is.</p>
        )}
        <LocationPicker value={loc} center={selected?.center} geometry={selected?.geometry}
          onPick={(lat, lng) => setLoc({ lat, lng, source: "manual" })} />
      </div>

      <label className="block">
        <span className="mb-1 block font-medium">Details <span className="font-normal opacity-60">(optional)</span></span>
        <textarea className="w-full rounded-lg border border-slate-500/50 !bg-slate-800 p-2.5 !text-white" rows={3} maxLength={1000}
          value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}

      <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-60">
        {busy ? "Submitting..." : "Submit report"}
      </button>
    </form>
  );
}


