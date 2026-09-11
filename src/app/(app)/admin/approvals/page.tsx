import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pendingWork } from "@/lib/queries";
import { dayOf, niceDate } from "@/lib/dates";
import { DecideButtons } from "@/components/DecideButtons";
import { RoleButtons } from "@/components/RoleButtons";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/today");

  const work = await pendingWork();

  const everyone = (await sql`
    select u.id, u.name, u.email, u.role, u.position, u.department,
           u.university, u.created_at, a.name as approved_by_name
    from users u
    left join users a on a.id = u.approved_by
    where u.role <> 'pending'
    order by
      case u.role when 'superuser' then 0 when 'admin' then 1 else 2 end,
      u.name
  `) as {
    id: number;
    name: string;
    email: string;
    role: string;
    position: string | null;
    department: string | null;
    university: string | null;
    created_at: string;
    approved_by_name: string | null;
  }[];

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">Who can use this system</p>
        <h1>Approvals</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          Signing up creates an account that opens nothing. This page is where
          it becomes an intern or a supervisor.
        </p>
      </header>

      <div className="stack-l">
        <section className="panel">
          <header>
            <h2>Waiting</h2>
            <span className={`pill ${work.accounts.length ? "wait" : "off"}`}>
              {work.accounts.length || "none"}
            </span>
          </header>

          {work.accounts.length === 0 ? (
            <p className="empty">Nobody is waiting.</p>
          ) : (
            <div className="divide">
              {work.accounts.map((account) => (
                <div key={account.id} className="row" style={{ padding: "15px 20px" }}>
                  <div className="grow">
                    <b>{account.name}</b>
                    <p className="small faint mono">{account.email}</p>
                    <p className="small muted">
                      {[account.position, account.department, account.university]
                        .filter(Boolean)
                        .join(" · ") || "No details given"}
                    </p>
                  </div>
                  <RoleButtons
                    id={account.id}
                    canMakeOwner={user.role === "superuser"}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {(work.overrides.length > 0 || work.leave.length > 0) && (
          <section className="panel">
            <header>
              <h2>Requests</h2>
              <span className="pill wait">
                {work.overrides.length + work.leave.length}
              </span>
            </header>
            <div className="divide">
              {work.overrides.map((req) => (
                <div key={`o${req.id}`} className="row" style={{ padding: "14px 20px" }}>
                  <div className="grow">
                    <p style={{ fontSize: 14 }}>
                      <b>{req.name}</b> &middot; sign {req.kind} from outside on{" "}
                      <span className="mono">{niceDate(dayOf(req.work_date))}</span>
                    </p>
                    <p className="small muted">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                  <DecideButtons kind="override" id={req.id} />
                </div>
              ))}
              {work.leave.map((req) => (
                <div key={`l${req.id}`} className="row" style={{ padding: "14px 20px" }}>
                  <div className="grow">
                    <p style={{ fontSize: 14 }}>
                      <b>{req.name}</b> &middot; leave{" "}
                      <span className="mono">
                        {niceDate(dayOf(req.from_date))} to{" "}
                        {niceDate(dayOf(req.to_date))}
                      </span>
                    </p>
                    <p className="small muted">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                  <DecideButtons kind="leave" id={req.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel">
          <header>
            <h2>Accounts</h2>
            <span className="small faint">{everyone.length}</span>
          </header>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Position</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {everyone.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <b>{person.name}</b>
                      {person.id === user.id && (
                        <span className="small faint"> (you)</span>
                      )}
                    </td>
                    <td className="dim">{person.email}</td>
                    <td>
                      <span className={`pill ${person.role === "intern" ? "off" : "on"}`}>
                        {person.role === "superuser"
                          ? "owner"
                          : person.role === "admin"
                            ? "supervisor"
                            : "intern"}
                      </span>
                    </td>
                    <td className="dim">
                      {[person.position, person.department]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="dim">
                      {niceDate(dayOf(person.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
