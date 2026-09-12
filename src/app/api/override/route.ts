import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";
import { metresBetween, parseFix } from "@/lib/geo";
import { getSetting, placedOffice } from "@/lib/settings";
import { officeToday } from "@/lib/dates";

/**
 * An intern who is genuinely at work but outside the fence, or whose phone
 * cannot get a fix, asks here. It records nothing as attendance. A supervisor
 * has to approve it before anything lands on the sheet.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser("intern");
    const body = (await request.json()) as Record<string, unknown>;

    const reason = String(body.reason ?? "").trim();
    if (reason.length < 10) {
      return Response.json(
        { error: "Write a bit more so your supervisor knows what happened." },
        { status: 400 }
      );
    }

    const kind = body.kind === "out" ? "out" : "in";
    const today = officeToday();
    const office = placedOffice(await getSetting("office"));
    const fix = parseFix({
      lat: body.lat,
      lng: body.lng,
      accuracy: body.accuracy,
    });
    const distance =
      fix && office
        ? metresBetween(fix.lat, fix.lng, office.lat, office.lng)
        : null;

    const already = (await sql`
      select id from override_requests
      where user_id = ${user.id} and work_date = ${today}
        and kind = ${kind} and status = 'pending'
    `) as { id: number }[];

    if (already.length) {
      return Response.json(
        { error: "You already have a request waiting for today." },
        { status: 409 }
      );
    }

    await sql`
      insert into override_requests
        (user_id, work_date, kind, reason, lat, lng, accuracy, distance)
      values
        (${user.id}, ${today}, ${kind}, ${reason},
         ${fix?.lat ?? null}, ${fix?.lng ?? null}, ${fix?.accuracy ?? null}, ${distance})
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}
