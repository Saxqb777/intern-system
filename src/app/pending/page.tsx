import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "intern") redirect("/today");
  if (isStaff(user.role)) redirect("/admin");

  const admins = (await sql`
    select name from users where role in ('admin', 'superuser') order by name
  `) as { name: string }[];

  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">Account created</p>
          <h1>Waiting for approval</h1>
        </div>

        <p className="lede small">
          Your account exists but it does not open anything yet. A supervisor
          has to approve you and say whether you are an intern or an admin.
        </p>

        <p className="note plain" style={{ marginTop: 16 }}>
          {admins.length ? (
            <>
              Ask{" "}
              <b>
                {admins.length === 1
                  ? admins[0].name
                  : admins.map((a) => a.name).join(", ")}
              </b>{" "}
              to approve <b>{user.email}</b>.
            </>
          ) : (
            <>
              Nobody can approve you yet, because no supervisor has been set up.
              Whoever owns this system needs to create their account first.
            </>
          )}
        </p>

        <div style={{ marginTop: 18 }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
