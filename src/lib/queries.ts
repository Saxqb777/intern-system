import { sql } from "@/lib/db";
import {
  dayOf,
  minutesBetween,
  officeToday,
  weekdaysBetween,
} from "@/lib/dates";

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
 *
 * Takes every intern at once. The dashboard shows a summary per person, and
 * asking per person meant a separate trip to the database for each of them.
 * One query, then the arithmetic happens here.
 *
 * Expected days are the Monday-to-Friday dates in the range capped at today,
 * so a placement still running is not counted as full of absences.
 */
export async function summariesFor(
  userIds: number[],
  fromDate: string,
  toDate: string,
  dayStart: string
): Promise<Map<number, Summary>> {
  const out = new Map<number, Summary>();
  if (userIds.length === 0) return out;

  // Passed as a joined string rather than a JS array: the driver hands an
  // array over as "[2,3]" and Postgres wants "{2,3}", so an array parameter
  // fails with "malformed array literal".
  const ids = userIds.join(",");

  const rows = (await sql`
    select user_id, work_date, time_in, time_out, status
    from attendance
    where user_id = any(string_to_array(${ids}, ',')::int[])
      and work_date between ${fromDate} and ${toDate}
  `) as {
    user_id: number;
    work_date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
  }[];

  const today = officeToday();
  const cappedTo = toDate < today ? toDate : today;
  const expected = weekdaysBetween(fromDate, cappedTo);

  const [lateH, lateM] = dayStart.split(":").map(Number);
  const graceMinutes = lateH * 60 + lateM + 10; // ten minutes of grace

  const byUser = new Map<number, Map<string, (typeof rows)[number]>>();
  for (const row of rows) {
    let days = byUser.get(row.user_id);
    if (!days) {
      days = new Map();
      byUser.set(row.user_id, days);
    }
    days.set(dayOf(row.work_date), row);
  }

  for (const userId of userIds) {
    const days = byUser.get(userId) ?? new Map();
    let worked = 0;
    let leave = 0;
    let absent = 0;
    let minutes = 0;
    let late = 0;

    for (const day of expected) {
      const row = days.get(day);
      if (!row || (row.status !== "leave" && !row.time_in)) {
        if (row?.status === "leave") leave++;
        else absent++;
        continue;
      }
      if (row.status === "leave") {
        leave++;
        continue;
      }

      worked++;
      minutes += minutesBetween(row.time_in, row.time_out);

      // Gulf Standard Time is UTC+4 all year, so a fixed shift is correct.
      const gulf = new Date(new Date(row.time_in!).getTime() + 4 * 60 * 60_000);
      if (gulf.getUTCHours() * 60 + gulf.getUTCMinutes() > graceMinutes) late++;
    }

    out.set(userId, {
      worked_days: worked,
      leave_days: leave,
      absent_days: absent,
      minutes,
      expected_days: expected.length,
      late_days: late,
    });
  }

  return out;
}

/** One person's numbers. Thin wrapper so single-intern pages read plainly. */
export async function summaryFor(
  userId: number,
  fromDate: string,
  toDate: string,
  dayStart: string
): Promise<Summary> {
  const all = await summariesFor([userId], fromDate, toDate, dayStart);
  return (
    all.get(userId) ?? {
      worked_days: 0,
      leave_days: 0,
      absent_days: 0,
      minutes: 0,
      expected_days: 0,
      late_days: 0,
    }
  );
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
