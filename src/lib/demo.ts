import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { weekdaysBetween } from "@/lib/dates";

/**
 * Demo people and a few weeks of plausible attendance, so the system can be
 * walked through and explained before anybody real uses it.
 *
 * Everything written here carries is_demo, which is the only thing that lets
 * "go live" wipe it cleanly without touching a real record.
 */

const DEMO_PEOPLE = [
  {
    email: "demo.maryam@agthia.com",
    name: "Maryam Al Blooshi",
    position: "Marketing intern",
    department: "Marketing",
    university: "UAEU",
  },
  {
    email: "demo.omar@agthia.com",
    name: "Omar Haddad",
    position: "Supply chain intern",
    department: "Supply Chain",
    university: "Khalifa University",
  },
];

const DEMO_PASSWORD = "demo1234";

const DEMO_LOGS = [
  "Sat in on the supplier call about the date packaging line. Pulled last quarter's volumes into a sheet for Khalid.",
  "Started on the HACCP file. Two hours on the floor with the QA team watching the sorting line.",
  "Wrote up the competitor pricing notes. Khalid wants a one page summary by Thursday.",
  "Stock count in the cold store. Learned how the batch codes work.",
  "Finished the summary. Sent it over and got it back with three changes.",
];

export type SeedResult = { people: number; days: number };

export async function seedDemo(mentorName: string): Promise<SeedResult> {
  const internship = await getSetting("internship");
  const hash = await hashPassword(DEMO_PASSWORD);
  const ids: number[] = [];

  for (const person of DEMO_PEOPLE) {
    const rows = (await sql`
      insert into users (email, name, password_hash, role, position, department,
                         university, mentor, approved_at, is_demo)
      values (${person.email}, ${person.name}, ${hash}, 'intern', ${person.position},
              ${person.department}, ${person.university}, ${mentorName}, now(), true)
      on conflict (email) do update set
        name = excluded.name, role = 'intern', is_demo = true,
        position = excluded.position, department = excluded.department
      returning id
    `) as { id: number }[];
    ids.push(rows[0].id);
  }

  // Three weeks up to today, or the placement so far, whichever is shorter.
  const today = new Date(Date.now() + 4 * 60 * 60_000).toISOString().slice(0, 10);
  const threeWeeksAgo = new Date(Date.now() - 21 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const from =
    internship.start_date > threeWeeksAgo ? internship.start_date : threeWeeksAgo;
  const days = weekdaysBetween(from, today);

  let written = 0;

  for (const [index, userId] of ids.entries()) {
    for (const [dayIndex, day] of days.entries()) {
      // A believable pattern rather than a perfect one: one day of leave and
      // one short day each, so the summary numbers actually show something.
      const slot = (dayIndex + index * 2) % 9;

      if (slot === 4) {
        await sql`
          insert into attendance (user_id, work_date, status, note, is_demo)
          values (${userId}, ${day}, 'leave', 'University exam', true)
          on conflict (user_id, work_date) do update
            set status = 'leave', note = excluded.note, is_demo = true
        `;
        written++;
        continue;
      }

      const inMinute = 540 + ((dayIndex * 7 + index * 3) % 22) - 4; // around 09:00
      const outMinute = slot === 7 ? 930 : 1020 + ((dayIndex * 5) % 12); // 15:30 or ~17:00
      const isToday = day === today;

      await sql`
        insert into attendance (
          user_id, work_date, time_in, time_out, in_distance, out_distance,
          in_accuracy, out_accuracy, status, is_demo
        ) values (
          ${userId}, ${day},
          ${stamp(day, inMinute)},
          ${isToday && index === 1 ? null : stamp(day, outMinute)},
          ${28 + (dayIndex % 40)}, ${31 + (dayIndex % 35)},
          ${8 + (dayIndex % 7)}, ${9 + (dayIndex % 6)},
          'present', true
        )
        on conflict (user_id, work_date) do update set
          time_in = excluded.time_in, time_out = excluded.time_out,
          status = 'present', is_demo = true
      `;
      written++;

      if (dayIndex % 3 === 0) {
        await sql`
          insert into work_logs (user_id, work_date, body, is_demo)
          values (${userId}, ${day}, ${DEMO_LOGS[dayIndex % DEMO_LOGS.length]}, true)
          on conflict (user_id, work_date) do update
            set body = excluded.body, is_demo = true
        `;
      }
    }

    await sql`
      insert into tasks (user_id, title, due_date, created_by, is_demo)
      values
        (${userId}, 'Finish the supplier comparison sheet', ${days[days.length - 1]}, ${userId}, true),
        (${userId}, 'Read the HACCP induction pack', null, ${userId}, true)
    `;
  }

  // One of each thing a supervisor has to decide, so the demo shows the queue.
  if (ids.length) {
    await sql`
      insert into override_requests (user_id, work_date, kind, reason, distance, is_demo)
      values (${ids[1] ?? ids[0]}, ${today}, 'in',
              'Working at the Al Saad site today with Khalid, GPS will not lock inside the cold store.',
              4230, true)
    `;
    await sql`
      insert into leave_requests (user_id, from_date, to_date, reason, is_demo)
      values (${ids[0]}, ${addDays(today, 5)}, ${addDays(today, 5)}, 'University exam', true)
    `;
  }

  return { people: ids.length, days: written };
}

/** Removes everything seeding created, and nothing else. */
export async function wipeDemo(): Promise<void> {
  await sql`delete from attendance where is_demo = true`;
  await sql`delete from work_logs where is_demo = true`;
  await sql`delete from tasks where is_demo = true`;
  await sql`delete from override_requests where is_demo = true`;
  await sql`delete from leave_requests where is_demo = true`;
  // Users last: the rows above point at them.
  await sql`delete from users where is_demo = true`;
}

export async function countDemo(): Promise<number> {
  const rows = (await sql`
    select
      (select count(*) from users where is_demo) +
      (select count(*) from attendance where is_demo) +
      (select count(*) from work_logs where is_demo) +
      (select count(*) from tasks where is_demo) +
      (select count(*) from override_requests where is_demo) +
      (select count(*) from leave_requests where is_demo) as total
  `) as { total: string }[];
  return Number(rows[0]?.total ?? 0);
}

export const DEMO_LOGIN = { password: DEMO_PASSWORD, people: DEMO_PEOPLE };

function stamp(day: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return new Date(`${day}T${h}:${m}:00+04:00`).toISOString();
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
