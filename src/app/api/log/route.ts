import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";
import { officeToday } from "@/lib/dates";

/** One entry per intern per day, overwritten as they keep typing. */
export async function POST(request: Request) {
  try {
    const user = await requireUser("intern");
    const body = (await request.json()) as Record<string, unknown>;

    const date = String(body.date ?? officeToday());
    const text = String(body.body ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Bad date." }, { status: 400 });
    }

    if (!text) {
      await sql`
        delete from work_logs where user_id = ${user.id} and work_date = ${date}
      `;
      return Response.json({ ok: true, cleared: true });
    }

    await sql`
      insert into work_logs (user_id, work_date, body, updated_at)
      values (${user.id}, ${date}, ${text}, now())
      on conflict (user_id, work_date) do update
        set body = excluded.body, updated_at = now()
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}
