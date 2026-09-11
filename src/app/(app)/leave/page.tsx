import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { niceDate } from "@/lib/dates";
import { LeaveForm } from "./LeaveForm";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "intern") redirect("/admin");

  const requests = (await sql`
    select l.id, l.from_date, l.to_date, l.reason, l.status, l.created_at,
           u.name as decided_by_name
    from leave_requests l
    left join users u on u.id = l.decided_by
    where l.user_id = ${user.id}
    order by l.created_at desc
  `) as {
    id: number;
    from_date: string;
    to_date: string;
    reason: string;
    status: string;
    decided_by_name: string | null;
  }[];

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">Days off</p>
        <h1>Leave</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          Ask before you take a day, and it shows on your sheet as approved
          leave instead of a blank row your university has to ask about.
        </p>
      </header>

      <div className="stack-l">
        <LeaveForm />

        <section className="panel">
          <header>
            <h2>Your requests</h2>
          </header>
          {requests.length === 0 ? (
            <p className="empty">You have not asked for any days off.</p>
          ) : (
            <div className="divide">
              {requests.map((req) => (
                <div key={req.id} className="spread" style={{ padding: "15px 20px" }}>
                  <div className="grow">
                    <p className="mono" style={{ fontSize: 14, fontWeight: 500 }}>
                      {req.from_date.slice(0, 10) === req.to_date.slice(0, 10)
                        ? niceDate(req.from_date.slice(0, 10))
                        : `${niceDate(req.from_date.slice(0, 10))} to ${niceDate(req.to_date.slice(0, 10))}`}
                    </p>
                    <p className="small muted">{req.reason}</p>
                    {req.decided_by_name && (
                      <p className="small faint">
                        {req.status === "approved" ? "Approved" : "Rejected"} by{" "}
                        {req.decided_by_name}
                      </p>
                    )}
                  </div>
                  <span className={`pill ${statusPill(req.status)}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function statusPill(status: string): string {
  if (status === "approved") return "on";
  if (status === "rejected") return "stop";
  return "wait";
}
