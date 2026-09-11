import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { countDemo, DEMO_LOGIN } from "@/lib/demo";
import { SystemControls } from "./SystemControls";

export const dynamic = "force-dynamic";

export default async function SuperPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "superuser") redirect("/admin");

  const [test, demoRows, office] = await Promise.all([
    getSetting("test_mode"),
    countDemo(),
    getSetting("office"),
  ]);

  const counts = (await sql`
    select
      count(*) filter (where role = 'intern')    as interns,
      count(*) filter (where role = 'admin')     as admins,
      count(*) filter (where role = 'superuser') as owners,
      count(*) filter (where role = 'pending')   as pending
    from users
  `) as { interns: string; admins: string; owners: string; pending: string }[];

  const tally = counts[0];

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">System owner only</p>
        <h1>System</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          Test mode, demo data, and the switch that makes this real.
        </p>
      </header>

      <div className="stack-l">
        <SystemControls
          testMode={test.on}
          simulateOutside={Boolean(test.simulate_outside)}
          demoRows={demoRows}
          officeLabel={office.label}
          radius={office.radius_m}
          demoPassword={DEMO_LOGIN.password}
          demoEmails={DEMO_LOGIN.people.map((p) => p.email)}
        />

        <section className="panel">
          <header>
            <h2>Who is on the system</h2>
          </header>
          <div className="tablewrap">
            <table>
              <tbody>
                <Line label="Interns" value={tally.interns} />
                <Line label="Supervisors" value={tally.admins} />
                <Line label="System owners" value={tally.owners} />
                <Line label="Waiting for approval" value={tally.pending} />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="num" style={{ textAlign: "end" }}>
        {value}
      </td>
    </tr>
  );
}
