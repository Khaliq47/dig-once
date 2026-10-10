export type Role = "citizen" | "department";

export interface Profile {
  id: string;
  role: Role;
  department_name: string | null;
}

export type ProjectStatus = "planned" | "ongoing" | "delayed" | "stalled" | "completed";
export type ReportStatus = "submitted" | "verified" | "forwarded" | "resolved";

export interface Project {
  id: number;
  title: string;
  type: string;
  department: string;
  contractor: string | null;
  budget: number | null;
  start_date: string | null; // planned start, "YYYY-MM-DD"
  end_date: string | null;   // planned end
  actual_end: string | null; // when it really finished
  status: ProjectStatus | null;
  progress: number;          // 0 to 100
  delay_reason: string | null;
  road_id: number | null;
  geom: unknown;
  created_at: string | null;
  summary_en: string | null;
  summary_ta: string | null;
  delay_draft: string | null;
}

export interface Road {
  id: number;
  osm_id: number | null;
  name: string | null;
  highway: string | null;
  geom: unknown;
}

export interface Follow {
  user_id: string;
  project_id: number;
}

export interface Report {
  id: number;
  project_id: number;
  user_id: string | null;
  message: string | null;
  created_at: string | null;
  status: ReportStatus;
}