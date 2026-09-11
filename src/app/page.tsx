import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Nothing lives at the root. It just points you at your own part of the app. */
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "intern") redirect("/today");
  if (isStaff(user.role)) redirect("/admin");
  redirect("/pending");
}
