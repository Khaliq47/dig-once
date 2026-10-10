export type ReportStatus =
  | "submitted" | "flagged" | "verified" | "forwarded" | "resolved" | "rejected";

export type Report = {
  id: string;
  project_id: string;
  user_id: string;
  category: string;
  note: string | null;
  photo_path: string | null;
  location_source: "exif" | "browser" | "manual";
  distance_to_project_m: number | null;
  status: ReportStatus;
  ai_status: "pending" | "classified" | "unclassified";
  ai_category: "road_cut" | "drain" | "pipeline" | "other" | null;
  ai_confidence: number | null;
  duplicate_of: string | null;
  confirm_count: number;
  dispute_count: number;
  trust_score: number;
  verified_at: string | null;
  created_at: string;
};

export type ReportEvent = { id: number; status: string; note: string | null; created_at: string };

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "abandoned", label: "Work has been abandoned" },
  { value: "not_completed", label: "Marked complete but unfinished" },
  { value: "delay", label: "Work is delayed" },
  { value: "poor_quality", label: "Poor quality work" },
  { value: "safety", label: "Safety hazard" },
  { value: "other", label: "Something else" },
];

export const AI_LABELS: Record<string, string> = {
  road_cut: "Road cut", drain: "Drain work", pipeline: "Pipeline work", other: "Other work",
};

export const STATUS_STYLE: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-slate-100 text-slate-700 ring-slate-300" },
  flagged:   { label: "Wrong location", cls: "bg-amber-100 text-amber-800 ring-amber-300" },
  verified:  { label: "Verified", cls: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  forwarded: { label: "Sent to department", cls: "bg-blue-100 text-blue-800 ring-blue-300" },
  resolved:  { label: "Resolved", cls: "bg-green-100 text-green-800 ring-green-300" },
  rejected:  { label: "Disputed", cls: "bg-rose-100 text-rose-800 ring-rose-300" },
};

export const VERIFY_THRESHOLD = 4; // keep in sync with report_rules() in SQL

export function photoUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-photos/${path}`;
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Explicit column list: avoids pulling the raw `geom` column to the browser.
export const REPORT_COLUMNS =
  "id,project_id,user_id,category,note,photo_path,location_source,distance_to_project_m,status," +
  "ai_status,ai_category,ai_confidence,duplicate_of,confirm_count,dispute_count,trust_score," +
  "verified_at,created_at";
