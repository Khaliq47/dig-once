import { NextResponse } from "next/server";
import { supabaseAsUser, supabaseAdmin } from "@/lib/reports/server";
import { classifyPhoto, type AiResult } from "@/lib/reports/gemini";

const CATEGORIES = ["abandoned", "not_completed", "delay", "poor_quality", "safety", "other"];
const SOURCES = ["exif", "browser", "manual"];

// Never let an unexpected error leave the browser with an empty response.
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

async function handle(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Log in to submit a report" }, { status: 401 });

  let b: any;
  try { b = await req.json(); } catch {
    return bad("Invalid request");
  }

  const lat = Number(b.lat), lng = Number(b.lng);
  const pid = Number(b.project_id);
  if (!Number.isInteger(pid) || pid <= 0) return bad("Choose a project");
  if (!CATEGORIES.includes(b.category)) return bad("Choose a category");
  if (!SOURCES.includes(b.location_source)) return bad("Location source is missing");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return bad("Location is missing");
  if (typeof b.note === "string" && b.note.length > 1000) return bad("Note is too long (max 1000 characters)");

  // 1) Insert as the user. SQL triggers decide status, distance and duplicates.
  const { data: report, error } = await supabaseAsUser(token)
    .rpc("submit_report", {
      p_project_id: pid,
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

  // 2) Classify the photo once and store the result. Optional: any failure
  //    (missing key, Gemini down, timeout) just leaves the report unlabelled.
  const r = report as { id: string; photo_path: string | null };
  let ai: AiResult | null = null;
  try {
    if (r.photo_path && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = supabaseAdmin();
      const { data: blob } = await admin.storage.from("report-photos").download(r.photo_path);
      ai = blob
        ? await classifyPhoto(await blob.arrayBuffer(), blob.type || "image/jpeg")
        : { ai_status: "unclassified", ai_category: null, ai_confidence: null };
      await admin.from("reports").update(ai).eq("id", r.id);
    }
  } catch { /* keep the report, skip the label */ }

  return NextResponse.json({ ...(report as object), ...(ai ?? {}) });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
