import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";
import { weekdaysBetween } from "@/lib/dates";

/**
 * Approving or rejecting the two things interns ask for: an override on a
 * punch that fell outside the fence, and a day of leave.
 */
export async function POST(request: Request) {
  try {
    const staff = await requireUser("admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;

    const kind = String(body.kind ?? "");
    const id = Number(body.id);
    const approve = Boolean(body.approve);

    if (!Number.isFinite(id)) {
      return Response.json({ error: "Which request?" }, { status: 400 });
    }

    if (kind === "override") {
      const rows = (await sql`
        select user_id, work_date, kind, lat, lng, accuracy, distance
        from override_requests
        where id = ${id} and status = 'pending'
      `) as {
        user_id: number;
        work_date: string;
        kind: string;
        lat: number | null;
        lng: number | null;
        accuracy: number | null;
        distance: number | null;
      }[];

      if (!rows.length) {
        return Response.json(
          { error: "That request has already been decided." },
          { status: 409 }
        );
      }
      const req = rows[0];
      const date = req.work_date.slice(0, 10);
      const now = new Date().toISOString();

      if (approve) {
        if (req.kind === "in") {
          await sql`
            insert into attendance (
              user_id, work_date, time_in, in_lat, in_lng, in_accuracy,
              in_distance, in_override, status
            ) values (
              ${req.user_id}, ${date}, ${now}, ${req.lat}, ${req.lng},
              ${req.accuracy}, ${req.distance}, true, 'present'
            )
            on conflict (user_id, work_date) do update set
              time_in     = coalesce(attendance.time_in, excluded.time_in),
              in_override = true
          `;
        } else {
          await sql`
            update attendance set
              time_out = coalesce(time_out, ${now}),
              out_lat = ${req.lat}, out_lng = ${req.lng},
              out_accuracy = ${req.accuracy}, out_distance = ${req.distance},
              out_override = true
            where user_id = ${req.user_id} and work_date = ${date}
          `;
        }
      }

      await sql`
        update override_requests
        set status = ${approve ? "approved" : "rejected"},
            decided_by = ${staff.id}, decided_at = now()
        where id = ${id}
      `;

      return Response.json({ ok: true });
    }

    if (kind === "leave") {
      const rows = (await sql`
        select user_id, from_date, to_date, reason from leave_requests
        where id = ${id} and status = 'pending'
      `) as {
        user_id: number;
        from_date: string;
        to_date: string;
        reason: string;
      }[];

      if (!rows.length) {
        return Response.json(
          { error: "That request has already been decided." },
          { status: 409 }
        );
      }
      const req = rows[0];

      if (approve) {
        // Mark every working day in the range, so the sheet explains itself.
        // Sent as one transaction: a fortnight off is ten separate writes, and
        // half a leave request landing on the sheet is worse than none.
        const days = weekdaysBetween(
          req.from_date.slice(0, 10),
          req.to_date.slice(0, 10)
        );
        await sql.transaction(
          days.map(
            (day) => sql`
              insert into attendance (user_id, work_date, status, note)
              values (${req.user_id}, ${day}, 'leave', ${req.reason})
              on conflict (user_id, work_date) do update
                set status = 'leave', note = excluded.note
            `
          )
        );
      }

      await sql`
        update leave_requests
        set status = ${approve ? "approved" : "rejected"},
            decided_by = ${staff.id}, decided_at = now()
        where id = ${id}
      `;

      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown request type." }, { status: 400 });
  } catch (err) {
    return asErrorResponse(err);
  }
}
