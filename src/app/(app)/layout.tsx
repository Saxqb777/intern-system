import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isTestMode } from "@/lib/settings";
import { TopBar } from "@/components/Chrome";

export const dynamic = "force-dynamic";

/** Everything behind a login sits under here. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "pending") redirect("/pending");

  const testMode = await isTestMode();

  return (
    <>
      <TopBar name={user.name} role={user.role} testMode={testMode} />
      <main className="shell">{children}</main>
    </>
  );
}
