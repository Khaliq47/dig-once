import { NextResponse } from "next/server";
import { supabaseAsUser, supabaseAdmin } from "@/lib/reports/server";
import { classifyPhoto } from "@/lib/reports/gemini";

const CATEGORIES = ["abandoned", "not_completed", "delay", "poor_quality", "safety", "other"];
const SOURCES = ["exif", "browser", "manual"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Log in to submit a report" }, { status: 401 });

  let b: any;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lat = Number(b.lat), lng = Number(b.lng);
  if (!UUID.test(b.project_id ?? "")) return bad("Choose a project");
  if (!CATEGORIES.includes(b.category)) return bad("Choose a category");
  if (!SOURCES.includes(b.location_source)) return bad("Location source is missing");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return bad("Location is missing");
  if (typeof b.note === "string" && b.note.length > 1000) return bad("Note is too long (max 1000 characters)");

  // 1) Insert as the user. SQL triggers decide status, distance and duplicates.
  const asUser = supabaseAsUser(token);
  const { data: report, error } = await asUser
    .rpc("submit_report", {
      p_project_id: b.project_id,
      p_category: b.category,
      p_note: b.note ?? null,
      p_photo_path: b.photo_path ?? null,
      p_lat: lat,
      p_lng: lng,
      p_source: b.location_source,
    })
    .single();
  if (error || !report) {
    return NextResponse.json({ error: error?.message ?? "Could not save the report" }, { status: 400 });
  }

  // 2) Classify the photo once and store the result. Never blocks the report.
  const admin = supabaseAdmin();
  let ai: Awaited<ReturnType<typeof classifyPhoto>> = {
    ai_status: "unclassified", ai_category: null, ai_confidence: null,
  };
  const r = report as { id: string; photo_path: string | null };
  if (r.photo_path) {
    try {
      const { data: blob } = await admin.storage.from("report-photos").download(r.photo_path);
      if (blob) ai = await classifyPhoto(await blob.arrayBuffer(), blob.type || "image/jpeg");
    } catch { /* keep "unclassified" */ }
  }
  await admin.from("reports").update(ai).eq("id", r.id);

  return NextResponse.json({ ...(report as object), ...ai });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
