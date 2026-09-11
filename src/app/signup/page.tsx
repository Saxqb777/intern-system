import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await currentUser();
  if (user) redirect("/");

  const domains = await getSetting("domains");
  const owners = (await sql`
    select id from users where role = 'superuser' limit 1
  `) as { id: number }[];

  // Nobody owns the system yet, so this is the very first run.
  const needsOwner = owners.length === 0;

  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">Al Foah office</p>
          <h1>Create your account</h1>
          <p className="lede small">
            Interns and supervisors both start here. Your supervisor decides
            which one you are.
          </p>
        </div>
        <SignupForm domains={domains} needsOwner={needsOwner} />
      </div>

      <p className="authfoot">
        Already have one? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
