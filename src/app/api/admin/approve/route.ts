import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";

/**
 * Turning a pending signup into a real account. This is the single place a
 * role is ever handed out, which is why nothing on the signup page can set one.
 */
export async function POST(request: Request) {
  try {
    const staff = await requireUser("admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;

    const id = Number(body.id);
    const role = String(body.role ?? "");

    if (!Number.isFinite(id)) {
      return Response.json({ error: "Which account?" }, { status: 400 });
    }

    if (role === "reject") {
      // Only ever deletes an account that has not been approved, so a mis-click
      // here can never wipe an intern who already has attendance on record.
      const gone = (await sql`
        delete from users where id = ${id} and role = 'pending' returning id
      `) as { id: number }[];
      if (!gone.length) {
        return Response.json(
          { error: "That account is already approved, so it cannot be rejected." },
          { status: 409 }
        );
      }
      return Response.json({ ok: true });
    }

    if (!["intern", "admin", "superuser"].includes(role)) {
      return Response.json({ error: "Unknown role." }, { status: 400 });
    }

    // Only the system owner can make another system owner.
    if (role === "superuser" && staff.role !== "superuser") {
      return Response.json(
        { error: "Only the system owner can make another system owner." },
        { status: 403 }
      );
    }

    await sql`
      update users
      set role = ${role}, approved_at = now(), approved_by = ${staff.id},
          mentor = coalesce(mentor, ${role === "intern" ? staff.name : null})
      where id = ${id}
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}
