import { redirect } from "next/navigation";
import { currentUser, isStaff } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { SettingsForms } from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/today");

  const [office, hours, internship] = await Promise.all([
    getSetting("office"),
    getSetting("hours"),
    getSetting("internship"),
  ]);

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">How the system behaves</p>
        <h1>Settings</h1>
      </header>

      <SettingsForms office={office} hours={hours} internship={internship} />
    </>
  );
}
