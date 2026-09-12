import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { OwnerForm } from "./OwnerForm";

export const dynamic = "force-dynamic";

/**
 * An administrator's own door. Not linked from anywhere: you get here by
 * knowing the URL, and through it by knowing the setup code.
 *
 * Deliberately separate from /signup. Whoever runs this system is not
 * necessarily an Agthia employee, so making them squeeze through the staff
 * form with its domain lock was the wrong shape.
 */
export default async function OwnerPage() {
  const user = await currentUser();
  if (user?.role === "superuser") redirect("/super");

  const owners = (await sql`
    select name, email from users where role = 'superuser' limit 1
  `) as { name: string; email: string }[];

  const taken = owners[0] ?? null;

  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">Administrator</p>
          <h1>{taken ? "Already set up" : "Set up this system"}</h1>
        </div>

        {taken ? (
          <>
            <p className="lede small">
              <b>{taken.name}</b> owns this system already, on{" "}
              <span className="mono">{taken.email}</span>. There can only be one
              first owner, and the setup code stopped working the moment that
              account was made.
            </p>
            <p className="note plain" style={{ marginTop: 16 }}>
              If that is you, just{" "}
              <Link href="/login">sign in normally</Link>. If you need a second
              owner, the first one can promote you from the Approvals page.
            </p>
          </>
        ) : (
          <>
            <p className="lede small">
              This makes you the owner: test mode, demo data, and the switch
              that takes the system live. Any email works here, because the
              setup code is what proves it is you.
            </p>
            <OwnerForm />
          </>
        )}
      </div>

      <p className="authfoot">
        Interns and supervisors do not come through here. They use{" "}
        <Link href="/signup">the normal signup</Link>.
      </p>
    </div>
  );
}
