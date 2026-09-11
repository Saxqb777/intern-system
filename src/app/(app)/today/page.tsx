import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting, workdayMinutes } from "@/lib/settings";
import {
  dayArabic,
  dayLong,
  minutesBetween,
  niceDate,
  officeToday,
  weekOf,
} from "@/lib/dates";
import { summaryFor } from "@/lib/queries";
import { humanMinutes } from "@/lib/dates";
import { Dial } from "./Dial";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "intern") redirect("/admin");

  const today = officeToday();
  const [office, hours, internship, test] = await Promise.all([
    getSetting("office"),
    getSetting("hours"),
    getSetting("internship"),
    getSetting("test_mode"),
  ]);

  const rows = (await sql`
    select time_in, time_out, signature from attendance
    where user_id = ${user.id} and work_date = ${today}
  `) as { time_in: string | null; time_out: string | null; signature: string | null }[];

  const row = rows[0] ?? null;

  const pending = (await sql`
    select kind from override_requests
    where user_id = ${user.id} and work_date = ${today} and status = 'pending'
  `) as { kind: string }[];

  const summary = await summaryFor(
    user.id,
    internship.start_date,
    internship.end_date,
    hours.start
  );

  return (
    <>
      <header className="pagehead">
        <div className="spread">
          <div>
            <p className="eyebrow">
              Week {weekOf(today, internship.start_date)} of your placement
            </p>
            <h1>{dayLong(today)}</h1>
            <p className="mono faint small" style={{ marginTop: 2 }}>
              {niceDate(today)}
            </p>
          </div>
          <p
            lang="ar"
            dir="rtl"
            style={{ fontSize: 24, color: "var(--ink-soft)" }}
          >
            {dayArabic(today)}
          </p>
        </div>
      </header>

      <Dial
        timeIn={row?.time_in ?? null}
        timeOut={row?.time_out ?? null}
        hasSignature={Boolean(row?.signature)}
        officeLabel={office.label}
        radius={office.radius_m}
        officeLat={office.lat}
        officeLng={office.lng}
        dayMinutes={workdayMinutes(hours)}
        startsAt={hours.start}
        endsAt={hours.end}
        testMode={test.on}
        simulateOutside={Boolean(test.on && test.simulate_outside)}
        pendingOverride={pending.length > 0}
        alreadyWorked={minutesBetween(row?.time_in ?? null, row?.time_out ?? null)}
      />

      <section
        className="panel"
        style={{ maxWidth: 430, marginInline: "auto", marginTop: 34 }}
      >
        <header>
          <h2>Your placement so far</h2>
        </header>
        <div className="body stack-s">
          <Line
            label="Days in"
            value={`${summary.worked_days} of ${summary.expected_days}`}
          />
          <Line label="Hours" value={humanMinutes(summary.minutes)} />
          <Line label="Approved leave" value={String(summary.leave_days)} />
          <Line
            label="Unexplained"
            value={String(summary.absent_days)}
            warn={summary.absent_days > 0}
          />

          <p className="small faint" style={{ marginTop: 8 }}>
            For your university. Already filled in.
          </p>

          <a
            className="btn solid wide"
            href={`/api/report?from=${internship.start_date}&to=${internship.end_date}`}
            download
          >
            Download my attendance sheet
          </a>
        </div>
      </section>
    </>
  );
}

function Line({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="spread small">
      <span className="faint">{label}</span>
      <span
        className="mono"
        style={warn ? { color: "var(--amber-ink)", fontWeight: 600 } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
