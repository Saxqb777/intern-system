import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";

/**
 * A supervisor certifying days an intern has signed out of.
 *
 * They draw once and it applies to the days they picked. Re-drawing the same
 * signature five times is not more honest than drawing it once deliberately,
 * and a supervisor with a fortnight of rows to sign would simply not do it.
 *
 * Only days that already have a sign-out time can be signed. There is nothing
 * to certify about a day somebody is still in the middle of.
 */
export async function POST(request: Request) {
  try {
    const staff = await requireUser("admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;

    const userId = Number(body.userId);
    const signature = String(body.signature ?? "");
    const dates = Array.isArray(body.dates) ? body.dates.map(String) : [];

    if (!Number.isFinite(userId)) {
      return bad("Which intern?");
    }
    if (!signature.startsWith("data:image/png;base64,") || signature.length > 400_000) {
      return bad("Draw your signature before saving.");
    }
    if (dates.length === 0) {
      return bad("Pick at least one day to sign.");
    }
    if (dates.length > 200) {
      return bad("That is too many days at once.");
    }
    if (!dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
      return bad("One of those dates is not a date.");
    }

    const signed = (await sql`
      update attendance set
        signature = ${signature},
        signed_by = ${staff.id},
        signed_at = now()
      where user_id = ${userId}
        and work_date = any(string_to_array(${dates.join(",")}, ',')::date[])
        and time_out is not null
      returning work_date
    `) as { work_date: string }[];

    if (signed.length === 0) {
      return bad(
        "None of those days could be signed. A day needs a sign-out time first."
      );
    }

    return Response.json({ ok: true, signed: signed.length });
  } catch (err) {
    return asErrorResponse(err);
  }
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
