import { sql } from "@/lib/db";
import { minutesBetween, officeToday, weekdaysBetween } from "@/lib/dates";

export type InternToday = {
  id: number;
  name: string;
  position: string | null;
  department: string | null;
  time_in: string | null;
  time_out: string | null;
  in_distance: number | null;
  status: string | null;
  minutes: number;
};

/** Everyone marked as an intern, with whatever happened today attached. */
export async function internsToday(): Promise<InternToday[]> {
  const today = officeToday();
  const rows = (await sql`
    select u.id, u.name, u.position, u.department,
           a.time_in, a.time_out, a.in_distance, a.status
    from users u
    left join attendance a
      on a.user_id = u.id and a.work_date = ${today}
    where u.role = 'intern'
    order by u.name
  `) as Omit<InternToday, "minutes">[];

  const now = new Date().toISOString();
  return rows.map((row) => ({
    ...row,
    minutes: row.time_in
      ? minutesBetween(row.time_in, row.time_out ?? now)
      : 0,
  }));
}

export type Summary = {
  worked_days: number;
  leave_days: number;
  absent_days: number;
  minutes: number;
  expected_days: number;
  late_days: number;
};

/**
 * The numbers a university actually asks about, over any range.
 * Expected days are the Monday-to-Friday dates in the range, so a placement
 * that has not finished yet is not counted as full of absences.
 */
export async function summaryFor(
  userId: number,
  fromDate: string,
  toDate: string,
  dayStart: string
): Promise<Summary> {
  const today = officeToday();
  const cappedTo = toDate < today ? toDate : today;

  const rows = (await sql`
    select work_date, time_in, time_out, status
    from attendance
    where user_id = ${userId}
      and work_date between ${fromDate} and ${toDate}
  `) as {
    work_date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
  }[];

  const byDate = new Map(rows.map((r) => [r.work_date.slice(0, 10), r]));
  const expected = weekdaysBetween(fromDate, cappedTo);

  let worked = 0;
  let leave = 0;
  let absent = 0;
  let minutes = 0;
  let late = 0;

  const [lateH, lateM] = dayStart.split(":").map(Number);
  const graceMinutes = lateH * 60 + lateM + 10; // ten minutes of grace

  for (const day of expected) {
    const row = byDate.get(day);
    if (!row) {
      absent++;
      continue;
    }
    if (row.status === "leave") {
      leave++;
      continue;
    }
    if (!row.time_in) {
      absent++;
      continue;
    }

    worked++;
    minutes += minutesBetween(row.time_in, row.time_out);

    const arrived = new Date(row.time_in);
    const gulf = new Date(arrived.getTime() + 4 * 60 * 60_000);
    if (gulf.getUTCHours() * 60 + gulf.getUTCMinutes() > graceMinutes) late++;
  }

  return {
    worked_days: worked,
    leave_days: leave,
    absent_days: absent,
    minutes,
    expected_days: expected.length,
    late_days: late,
  };
}

export type PendingWork = {
  accounts: {
    id: number;
    name: string;
    email: string;
    position: string | null;
    department: string | null;
    university: string | null;
  }[];
  overrides: {
    id: number;
    name: string;
    work_date: string;
    kind: string;
    reason: string;
    distance: number | null;
    created_at: string;
  }[];
  leave: {
    id: number;
    name: string;
    from_date: string;
    to_date: string;
    reason: string;
  }[];
};

/** Everything sitting on a supervisor's desk, in one round trip each. */
export async function pendingWork(): Promise<PendingWork> {
  const [accounts, overrides, leave] = await Promise.all([
    sql`
      select id, name, email, position, department, university
      from users where role = 'pending' order by created_at
    `,
    sql`
      select o.id, u.name, o.work_date, o.kind, o.reason, o.distance, o.created_at
      from override_requests o
      join users u on u.id = o.user_id
      where o.status = 'pending'
      order by o.created_at
    `,
    sql`
      select l.id, u.name, l.from_date, l.to_date, l.reason
      from leave_requests l
      join users u on u.id = l.user_id
      where l.status = 'pending'
      order by l.created_at
    `,
  ]);

  return {
    accounts: accounts as PendingWork["accounts"],
    overrides: overrides as PendingWork["overrides"],
    leave: leave as PendingWork["leave"],
  };
}
