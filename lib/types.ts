// TODO: finalise after Person 1's schema is agreed. Field names must match the database.

export type Role = "citizen" | "department";

export interface Profile {
  id: string;
  role: Role;
  department_name: string | null;
}