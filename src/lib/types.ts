export type Role = "pending" | "intern" | "admin" | "superuser";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  position: string | null;
  department: string | null;
  mentor: string | null;
  university: string | null;
  created_at: string;
};

export type Office = {
  /** Null until somebody stands in the office and sets it. */
  lat: number | null;
  lng: number | null;
  radius_m: number;
  label: string;
};

export type Hours = { start: string; end: string };

export type Internship = { start_date: string; end_date: string };

export type AttendanceRow = {
  id: number;
  user_id: number;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  in_distance: number | null;
  out_distance: number | null;
  in_accuracy: number | null;
  out_accuracy: number | null;
  signature: string | null;
  signed_by: number | null;
  signed_at: string | null;
  status: "present" | "leave" | "absent" | "edited";
  in_override: boolean;
  out_override: boolean;
  note: string | null;
};

/** Someone in the building, seen from the supervisor's dashboard. */
export type LiveIntern = {
  id: number;
  name: string;
  position: string | null;
  department: string | null;
  time_in: string | null;
  time_out: string | null;
  minutes: number;
  in_distance: number | null;
};
