import { sql } from "@/lib/db";
import { asErrorResponse, isStaff, requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { buildAttendanceSheet, type SheetRow } from "@/lib/report";

/**
 * Hands back the university's sheet as a .docx.
 * An intern can only ever pull their own; a supervisor can pull anyone's.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser("intern", "admin", "superuser");
    const params = new URL(request.url).searchParams;

    const internship = await getSetting("internship");
    const from = params.get("from") ?? internship.start_date;
    const to = params.get("to") ?? internship.end_date;

    const date = /^\d{4}-\d{2}-\d{2}$/;
    if (!date.test(from) || !date.test(to) || to < from) {
      return Response.json({ error: "Those dates do not work." }, { status: 400 });
    }

    const requested = Number(params.get("intern"));
    const targetId = isStaff(user.role) && Number.isFinite(requested)
      ? requested
      : user.id;

    if (!isStaff(user.role) && targetId !== user.id) {
      return Response.json({ error: "You can only pull your own sheet." }, { status: 403 });
    }

    // Falls back to a supervisor, never to whoever administers the system.
    const people = (await sql`
      select u.id, u.name, u.position, u.department,
             coalesce(
               u.mentor,
               (select name from users where role = 'admin' order by name limit 1)
             ) as mentor
      from users u
      where u.id = ${targetId}
    `) as {
      id: number;
      name: string;
      position: string | null;
      department: string | null;
      mentor: string | null;
    }[];

    if (!people.length) {
      return Response.json({ error: "No such intern." }, { status: 404 });
    }
    const person = people[0];

    const rows = (await sql`
      select a.work_date, a.time_in, a.time_out, a.status, a.signature,
             a.signed_at, s.name as signed_by_name, a.note
      from attendance a
      left join users s on s.id = a.signed_by
      where a.user_id = ${targetId} and a.work_date between ${from} and ${to}
      order by a.work_date
    `) as SheetRow[];

    const file = await buildAttendanceSheet({
      internName: person.name,
      position: person.position,
      department: person.department,
      mentor: person.mentor,
      fromDate: from,
      toDate: to,
      internshipStart: internship.start_date,
      rows,
    });

    const filename = `Attendance ${person.name} ${from} to ${to}.docx`;

    return new Response(new Uint8Array(file), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return asErrorResponse(err);
  }
}
