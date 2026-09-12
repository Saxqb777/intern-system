import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
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

  return (
    <>
      <TopBar name={user.name} role={user.role} />
      <main className="shell">{children}</main>
    </>
  );
}
