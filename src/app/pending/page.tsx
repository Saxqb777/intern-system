import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "intern") redirect("/today");
  if (isStaff(user.role)) redirect("/admin");

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
          has to approve it and say whether you are an intern or a supervisor.
        </p>

        <p className="note plain" style={{ marginTop: 16 }}>
          Let your supervisor know you have signed up as{" "}
          <b>{user.email}</b>. Sign in again once they tell you it is ready.
        </p>

        <div style={{ marginTop: 18 }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
