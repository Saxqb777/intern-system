import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";

/**
 * A supervisor correcting the record: an intern who forgot to sign out, a day
 * that needs marking absent, a time typed in wrong. Every edit stamps who did
 * it and when, because a sheet going to a university should be able to show
 * its own history.
 */
export async function POST(request: Request) {
  try {
    const staff = await requireUser("admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;

    const userId = Number(body.userId);
    const date = String(body.date ?? "");
    const status = String(body.status ?? "present");

    if (!Number.isFinite(userId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Bad intern or date." }, { status: 400 });
    }
    if (!["present", "leave", "absent", "edited"].includes(status)) {
      return Response.json({ error: "Unknown status." }, { status: 400 });
    }

    const timeIn = asTimestamp(date, body.timeIn);
    const timeOut = asTimestamp(date, body.timeOut);

    if (timeIn && timeOut && timeOut <= timeIn) {
      return Response.json(
        { error: "Sign out has to be after sign in." },
        { status: 400 }
      );
    }

    const note = String(body.note ?? "").trim() || null;

    await sql`
      insert into attendance (user_id, work_date, time_in, time_out, status, note, edited_by, edited_at)
      values (${userId}, ${date}, ${timeIn}, ${timeOut}, ${status}, ${note}, ${staff.id}, now())
      on conflict (user_id, work_date) do update set
        time_in   = excluded.time_in,
        time_out  = excluded.time_out,
        status    = excluded.status,
        note      = excluded.note,
        edited_by = excluded.edited_by,
        edited_at = now()
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}

/**
 * Takes "09:05" typed into a form and pins it to the right day in Gulf time.
 * Returns null for a blank, which is how a missing punch is stored.
 */
function asTimestamp(date: string, value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  // +04:00 is Gulf Standard Time, which has no daylight saving to worry about.
  return new Date(`${date}T${raw}:00+04:00`).toISOString();
}
