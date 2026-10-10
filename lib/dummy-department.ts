// SAMPLE DATA: replace with real tables once the schema is final.
export type ProjectStatus = "planned" | "ongoing" | "delayed" | "stalled" | "completed";
export type ReportStatus = "submitted" | "verified" | "forwarded" | "resolved";

export interface DeptProject {
  id: string;
  title: string;
  road: string;
  contractor: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  progress: number; // 0 to 100
  delay_reason: string;
}

export interface DeptReport {
  id: string;
  project_id: string;
  text: string;
  status: ReportStatus;
  created: string;
}

export const projectsDummy: DeptProject[] = [
  {
    id: "p1",
    title: "Drinking water pipeline replacement",
    road: "Station Road",
    contractor: "Metro Pipelines Ltd",
    start_date: "2026-09-15",
    end_date: "2026-10-05",
    status: "delayed",
    progress: 55,
    delay_reason: "",
  },
  {
    id: "p2",
    title: "Valve chamber repair",
    road: "Gandhi Street",
    contractor: "Chennai Infra Works",
    start_date: "2026-10-01",
    end_date: "2026-10-20",
    status: "ongoing",
    progress: 30,
    delay_reason: "",
  },
  {
    id: "p3",
    title: "New connection line",
    road: "Temple Road",
    contractor: "Kanchi Roadways",
    start_date: "2026-11-03",
    end_date: "2026-11-20",
    status: "planned",
    progress: 0,
    delay_reason: "",
  },
];

export const reportsDummy: DeptReport[] = [
  { id: "r1", project_id: "p1", text: "Work has stopped for a week and the trench is open.", status: "forwarded", created: "2026-10-07" },
  { id: "r2", project_id: "p1", text: "No barricades at night near the school gate.", status: "forwarded", created: "2026-10-08" },
  { id: "r3", project_id: "p2", text: "Road is blocked for buses during the morning.", status: "forwarded", created: "2026-10-09" },
];