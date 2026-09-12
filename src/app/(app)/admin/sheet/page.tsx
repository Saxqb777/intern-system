import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting, workdayMinutes } from "@/lib/settings";
import { summaryFor } from "@/lib/queries";
import { humanMinutes, officeToday } from "@/lib/dates";
import { SheetView } from "./SheetView";

export const dynamic = "force-dynamic";

export default async function SheetPage({
  searchParams,
}: {
  searchParams: Promise<{ intern?: string; from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/today");

  const params = await searchParams;
  const [internship, hours] = await Promise.all([
    getSetting("internship"),
    getSetting("hours"),
  ]);

  const interns = (await sql`
    select id, name, position, department from users
    where role = 'intern' order by name
  `) as {
    id: number;
    name: string;
    position: string | null;
    department: string | null;
  }[];

  if (interns.length === 0) {
    return (
      <>
        <header className="pagehead">
          <h1>Attendance</h1>
        </header>
        <div className="panel">
          <p className="empty">
            No interns yet. Approve someone as an intern and their sheet appears
            here.
          </p>
        </div>
      </>
    );
  }

  const wanted = Number(params.intern);
  const selected =
    interns.find((i) => i.id === wanted) ?? interns[0];

  const from = valid(params.from) ?? internship.start_date;
  const to = valid(params.to) ?? internship.end_date;

  const rows = (await sql`
    select a.work_date, a.time_in, a.time_out, a.status, a.note,
           a.signature is not null as signed, a.signed_at,
           s.name as signed_by_name,
           a.in_distance, a.out_distance, a.in_override, a.out_override,
           a.edited_by
    from attendance a
    left join users s on s.id = a.signed_by
    where a.user_id = ${selected.id} and a.work_date between ${from} and ${to}
    order by a.work_date
  `) as {
    work_date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    note: string | null;
    signed: boolean;
    signed_at: string | null;
    signed_by_name: string | null;
    in_distance: number | null;
    out_distance: number | null;
    in_override: boolean;
    out_override: boolean;
    edited_by: number | null;
  }[];

  const summary = await summaryFor(selected.id, from, to, hours.start);
  const dayMinutes = workdayMinutes(hours);

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">Attendance and reports</p>
        <h1>{selected.name}</h1>
        <p className="lede small" style={{ marginTop: 4 }}>
          {[selected.position, selected.department].filter(Boolean).join(" · ") ||
            "No position set"}
        </p>
      </header>

      <div className="stack-l">
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 1,
            background: "var(--rule)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <Stat label="Days worked" value={`${summary.worked_days}/${summary.expected_days}`} />
          <Stat label="Hours" value={humanMinutes(summary.minutes)} />
          <Stat label="Average day" value={summary.worked_days ? humanMinutes(Math.round(summary.minutes / summary.worked_days)) : "——"} />
          <Stat label="Late arrivals" value={String(summary.late_days)} tone={summary.late_days > 0 ? "warn" : undefined} />
          <Stat label="Leave" value={String(summary.leave_days)} />
          <Stat label="Unexplained" value={String(summary.absent_days)} tone={summary.absent_days > 0 ? "warn" : undefined} />
        </section>

        <SheetView
          canSign={user.role === "admin" || user.role === "superuser"}
          internName={selected.name}
          interns={interns}
          selectedId={selected.id}
          from={from}
          to={to}
          rows={rows}
          dayMinutes={dayMinutes}
          today={officeToday()}
        />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div style={{ background: "var(--surface)", padding: "15px 18px" }}>
      <p className="eyebrow">{label}</p>
      <p
        className="mono"
        style={{
          fontSize: 21,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          marginTop: 3,
          color: tone === "warn" ? "var(--amber-ink)" : "inherit",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function valid(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
