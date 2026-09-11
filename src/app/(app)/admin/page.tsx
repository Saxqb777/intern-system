import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { getSetting, isTestMode, workdayMinutes } from "@/lib/settings";
import { internsToday, pendingWork, summariesFor } from "@/lib/queries";
import {
  dayLong,
  humanMinutes,
  niceDate,
  officeTime,
  officeToday,
  weekOf,
} from "@/lib/dates";
import type { Summary } from "@/lib/queries";
import { DecideButtons } from "@/components/DecideButtons";
import { RoleButtons } from "@/components/RoleButtons";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/today");

  const today = officeToday();
  const [interns, work, hours, internship, testMode] = await Promise.all([
    internsToday(),
    pendingWork(),
    getSetting("hours"),
    getSetting("internship"),
    isTestMode(),
  ]);

  const dayMinutes = workdayMinutes(hours);
  const summaries = await summariesFor(
    interns.map((i) => i.id),
    internship.start_date,
    internship.end_date,
    hours.start
  );

  const todo =
    work.accounts.length + work.overrides.length + work.leave.length;

  return (
    <>
      <header className="pagehead">
        <div className="spread">
          <div>
            <p className="eyebrow">
              Week {weekOf(today, internship.start_date)} &middot;{" "}
              {niceDate(today)}
            </p>
            <h1>{dayLong(today)}</h1>
          </div>
          <Link className="btn solid" href="/admin/sheet">
            Attendance and reports
          </Link>
        </div>
      </header>

      <div className="stack-l">
        {testMode && (
          <p className="note warn">
            Test mode is on. The office fence is switched off and anything below
            may be demo data.{" "}
            {user.role === "superuser" ? (
              <Link href="/super">Go live in System</Link>
            ) : (
              "Ask the system owner to turn it off before the interns start."
            )}
          </p>
        )}

        {/* ---- who is in ---- */}
        <section>
          <h2 style={{ marginBottom: 12 }}>Today</h2>
          {interns.length === 0 ? (
            <div className="panel">
              <p className="empty">
                No interns yet. Once someone signs up and you approve them as an
                intern, they appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {interns.map((intern) => (
                <article key={intern.id} className="panel">
                  <div className="body stack-s">
                    <div className="row" style={{ gap: 9 }}>
                      <b style={{ fontSize: 15.5 }}>{intern.name}</b>
                      <span className={`pill ${pillFor(intern)}`}>
                        {labelFor(intern)}
                      </span>
                    </div>
                    <p className="small faint" style={{ marginTop: -4 }}>
                      {[intern.position, intern.department]
                        .filter(Boolean)
                        .join(" · ") || "No position set"}
                    </p>

                    <div className="metric">
                      <span className="big">
                        {intern.time_in ? humanMinutes(intern.minutes) : "——"}
                      </span>
                      <span className="lbl">
                        {intern.time_in
                          ? `of ${humanMinutes(dayMinutes)}`
                          : "not signed in"}
                      </span>
                    </div>

                    <div className="bar">
                      <i
                        style={{
                          width: `${Math.min(
                            (intern.minutes / dayMinutes) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mono faint" style={{ fontSize: 11.5 }}>
                      {intern.time_in
                        ? `In ${officeTime(intern.time_in)}${
                            intern.time_out
                              ? ` · out ${officeTime(intern.time_out)}`
                              : ""
                          }${
                            intern.in_distance !== null
                              ? ` · ${Math.round(intern.in_distance)} m from centre`
                              : ""
                          }`
                        : "Nothing recorded today"}
                    </p>

                    <Placement summary={summaries.get(intern.id)} />

                    <Link
                      className="btn tiny"
                      href={`/admin/sheet?intern=${intern.id}`}
                      style={{ marginTop: 6, alignSelf: "flex-start" }}
                    >
                      Open their sheet
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ---- needs you ---- */}
        <section className="panel">
          <header>
            <h2>Needs you</h2>
            <span className={`pill ${todo ? "wait" : "off"}`}>
              {todo === 0 ? "all clear" : todo}
            </span>
          </header>

          {todo === 0 ? (
            <p className="empty">Nothing waiting on you.</p>
          ) : (
            <div className="divide">
              {work.overrides.map((req) => (
                <div key={`o${req.id}`} className="row" style={{ padding: "14px 20px" }}>
                  <div className="grow">
                    <p style={{ fontSize: 14 }}>
                      <b>{req.name}</b> wants to sign {req.kind} from outside the
                      fence on{" "}
                      <span className="mono">
                        {niceDate(req.work_date.slice(0, 10))}
                      </span>
                    </p>
                    <p className="small muted">&ldquo;{req.reason}&rdquo;</p>
                    {req.distance !== null && (
                      <p className="small faint mono">
                        {Math.round(req.distance)} m from the office
                      </p>
                    )}
                  </div>
                  <DecideButtons kind="override" id={req.id} />
                </div>
              ))}

              {work.leave.map((req) => (
                <div key={`l${req.id}`} className="row" style={{ padding: "14px 20px" }}>
                  <div className="grow">
                    <p style={{ fontSize: 14 }}>
                      <b>{req.name}</b> is asking for{" "}
                      <span className="mono">
                        {req.from_date.slice(0, 10) === req.to_date.slice(0, 10)
                          ? niceDate(req.from_date.slice(0, 10))
                          : `${niceDate(req.from_date.slice(0, 10))} to ${niceDate(req.to_date.slice(0, 10))}`}
                      </span>{" "}
                      off
                    </p>
                    <p className="small muted">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                  <DecideButtons kind="leave" id={req.id} />
                </div>
              ))}

              {work.accounts.map((account) => (
                <div key={`a${account.id}`} className="row" style={{ padding: "14px 20px" }}>
                  <div className="grow">
                    <p style={{ fontSize: 14 }}>
                      <b>{account.name}</b> signed up and needs a role
                    </p>
                    <p className="small faint mono">{account.email}</p>
                    <p className="small muted">
                      {[account.position, account.department, account.university]
                        .filter(Boolean)
                        .join(" · ") || "No details given"}
                    </p>
                  </div>
                  <RoleButtons id={account.id} canMakeOwner={user.role === "superuser"} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/** The three lines of placement totals under each intern's card. */
function Placement({ summary }: { summary: Summary | undefined }) {
  if (!summary) return null;
  return (
    <>
      <div
        className="spread small"
        style={{
          borderTop: "1px solid var(--rule-soft)",
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        <span className="faint">Placement so far</span>
        <span className="mono">
          {summary.worked_days}/{summary.expected_days} days &middot;{" "}
          {humanMinutes(summary.minutes)}
        </span>
      </div>
      <div className="spread small">
        <span className="faint">Late arrivals</span>
        <span className="mono">{summary.late_days}</span>
      </div>
      <div className="spread small">
        <span className="faint">Leave / absent</span>
        <span className="mono">
          {summary.leave_days} / {summary.absent_days}
        </span>
      </div>
    </>
  );
}

function pillFor(intern: { time_in: string | null; time_out: string | null; status: string | null }) {
  if (intern.status === "leave") return "wait";
  if (intern.time_out) return "off";
  if (intern.time_in) return "on";
  return "off";
}

function labelFor(intern: { time_in: string | null; time_out: string | null; status: string | null }) {
  if (intern.status === "leave") return "On leave";
  if (intern.time_out) return "Left";
  if (intern.time_in) return "On site";
  return "Not in";
}
