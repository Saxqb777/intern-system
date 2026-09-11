import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, isStaff } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(landingFor(user.role));

  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">Al Foah office</p>
          <h1>Sign in</h1>
          <p className="lede small">Internship attendance.</p>
        </div>
        <LoginForm />
      </div>

      <p className="authfoot">
        No account yet? <Link href="/signup">Create one</Link> with your Agthia
        email.
      </p>
    </div>
  );
}

function landingFor(role: string): string {
  if (role === "intern") return "/today";
  if (isStaff(role as never)) return "/admin";
  return "/pending";
}
