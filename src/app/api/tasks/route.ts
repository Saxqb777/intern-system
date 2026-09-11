import { sql } from "@/lib/db";
import { asErrorResponse, isStaff, requireUser } from "@/lib/auth";

/** Interns tick things off. Supervisors can also add tasks for an intern. */
export async function POST(request: Request) {
  try {
    const user = await requireUser("intern", "admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "add") {
      const title = String(body.title ?? "").trim();
      if (!title) {
        return Response.json({ error: "Give the task a name." }, { status: 400 });
      }

      // An intern can only add to their own list.
      const target = isStaff(user.role) ? Number(body.userId) : user.id;
      if (!Number.isFinite(target)) {
        return Response.json({ error: "Pick who it is for." }, { status: 400 });
      }

      const due = String(body.due ?? "").trim() || null;
      await sql`
        insert into tasks (user_id, title, detail, due_date, created_by)
        values (${target}, ${title}, ${String(body.detail ?? "").trim() || null},
                ${due}, ${user.id})
      `;
      return Response.json({ ok: true });
    }

    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "Which task?" }, { status: 400 });
    }

    // Ownership check lives in the SQL so there is no window between the
    // check and the write.
    const scope = isStaff(user.role) ? null : user.id;

    if (action === "toggle") {
      const done = Boolean(body.done);
      const changed = (await sql`
        update tasks set done = ${done}, done_at = ${done ? new Date().toISOString() : null}
        where id = ${id} and (${scope}::int is null or user_id = ${scope})
        returning id
      `) as { id: number }[];
      if (!changed.length) {
        return Response.json({ error: "That task is not yours." }, { status: 403 });
      }
      return Response.json({ ok: true });
    }

    if (action === "delete") {
      const gone = (await sql`
        delete from tasks
        where id = ${id} and (${scope}::int is null or user_id = ${scope})
        returning id
      `) as { id: number }[];
      if (!gone.length) {
        return Response.json({ error: "That task is not yours." }, { status: 403 });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    return asErrorResponse(err);
  }
}
