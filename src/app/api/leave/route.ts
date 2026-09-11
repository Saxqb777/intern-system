import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";

/**
 * Interns ask for days off here. An approved request writes "leave" rows onto
 * the attendance sheet, so the university sees an explained absence rather
 * than an unexplained gap.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser("intern");
    const body = (await request.json()) as Record<string, unknown>;

    const from = String(body.from ?? "");
    const to = String(body.to ?? "");
    const reason = String(body.reason ?? "").trim();

    const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isDate(from) || !isDate(to)) {
      return Response.json({ error: "Pick both dates." }, { status: 400 });
    }
    if (to < from) {
      return Response.json(
        { error: "The last day cannot be before the first." },
        { status: 400 }
      );
    }
    if (reason.length < 4) {
      return Response.json({ error: "Say why, briefly." }, { status: 400 });
    }

    await sql`
      insert into leave_requests (user_id, from_date, to_date, reason)
      values (${user.id}, ${from}, ${to}, ${reason})
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}
