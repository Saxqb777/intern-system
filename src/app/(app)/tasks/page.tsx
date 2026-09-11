import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { TaskList } from "@/components/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "intern") redirect("/admin");

  const tasks = (await sql`
    select t.id, t.title, t.detail, t.done, t.due_date, u.name as from_name
    from tasks t
    left join users u on u.id = t.created_by
    where t.user_id = ${user.id}
    order by t.done asc, t.due_date asc nulls last, t.id desc
  `) as {
    id: number;
    title: string;
    detail: string | null;
    done: boolean;
    due_date: string | null;
    from_name: string | null;
  }[];

  const open = tasks.filter((t) => !t.done).length;

  return (
    <>
      <header className="pagehead">
        <p className="eyebrow">
          {open === 0
            ? "Nothing outstanding"
            : `${open} still to do`}
        </p>
        <h1>Tasks</h1>
        <p className="lede" style={{ marginTop: 6 }}>
          Yours, and your supervisor&rsquo;s.
        </p>
      </header>

      <TaskList tasks={tasks} canAdd ownerName={user.name} />
    </>
  );
}
