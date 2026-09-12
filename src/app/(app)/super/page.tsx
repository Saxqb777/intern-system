import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting, placedOffice } from "@/lib/settings";
import { niceDate } from "@/lib/dates";
import { AccountsPanel, type Person } from "./AccountsPanel";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "superuser") redirect("/admin");

  const office = await getSetting("office");
  const people = (await sql`
    select id, name, email, role, position, department, university, created_at
    from users
    order by
      case role
        when 'superuser' then 0
        when 'admin' then 1
        when 'intern' then 2
        else 3
      end,
      name
  `) as Person[];

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">Administration</p>
        <h1>Accounts</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          Everyone who can open this system, and the only place accounts are
          created or removed.
        </p>
      </header>

      <AccountsPanel
        people={people}
        meId={user.id}
        officePlaced={Boolean(placedOffice(office))}
        today={niceDate(new Date().toISOString().slice(0, 10))}
      />
    </>
  );
}
