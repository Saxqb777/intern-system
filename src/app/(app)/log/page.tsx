import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dayShort, niceDate, officeToday } from "@/lib/dates";
import { LogEditor } from "./LogEditor";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "intern") redirect("/admin");

  const today = officeToday();

  const rows = (await sql`
    select work_date, body, updated_at from work_logs
    where user_id = ${user.id}
    order by work_date desc
    limit 60
  `) as { work_date: string; body: string; updated_at: string }[];

  const todayRow = rows.find((r) => r.work_date.slice(0, 10) === today);
  const earlier = rows.filter((r) => r.work_date.slice(0, 10) !== today);

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">Your logbook</p>
        <h1>Work log</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          What you did each day.
        </p>
      </header>

      <div className="stack-l">
        <LogEditor date={today} initial={todayRow?.body ?? ""} />

        {earlier.length > 0 && (
          <section className="panel">
            <header>
              <h2>Earlier days</h2>
              <span className="small faint">{earlier.length} entries</span>
            </header>
            <div className="divide">
              {earlier.map((entry) => (
                <article key={entry.work_date} style={{ padding: "16px 20px" }}>
                  <p className="eyebrow" style={{ marginBottom: 5 }}>
                    {dayShort(entry.work_date.slice(0, 10))}{" "}
                    {niceDate(entry.work_date.slice(0, 10))}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{entry.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
