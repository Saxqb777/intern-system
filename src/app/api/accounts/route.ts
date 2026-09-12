import { sql } from "@/lib/db";
import {
  asErrorResponse,
  hashPassword,
  normaliseEmail,
  requireUser,
} from "@/lib/auth";

/**
 * The administrator making accounts directly, rather than waiting for people
 * to sign up and then approving them. This is how a supervisor account and an
 * intern account come to exist before anybody has touched the system.
 *
 * Deleting is here too, and it is real: attendance, logs, tasks and requests
 * go with the person, by the cascade on the foreign keys.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireUser("superuser");
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create");

    if (action === "delete") {
      const id = Number(body.id);
      if (!Number.isFinite(id)) {
        return bad("Which account?");
      }
      if (id === admin.id) {
        return bad("You cannot delete the account you are signed in with.");
      }

      const gone = (await sql`
        delete from users where id = ${id} returning name, email
      `) as { name: string; email: string }[];

      if (!gone.length) return bad("That account no longer exists.");
      return Response.json({ ok: true, removed: gone[0].name });
    }

    if (action === "password") {
      const id = Number(body.id);
      const password = String(body.password ?? "");
      if (!Number.isFinite(id)) return bad("Which account?");
      if (password.length < 8) return bad("Use at least 8 characters.");

      const changed = (await sql`
        update users set password_hash = ${await hashPassword(password)}
        where id = ${id} returning name
      `) as { name: string }[];

      if (!changed.length) return bad("That account no longer exists.");
      return Response.json({ ok: true });
    }

    // Creating.
    const name = String(body.name ?? "").trim();
    const email = normaliseEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const role = String(body.role ?? "intern");

    if (name.length < 2) return bad("Put their full name in.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return bad("That does not look like an email address.");
    }
    if (password.length < 8) return bad("Use at least 8 characters.");
    if (!["intern", "admin"].includes(role)) {
      return bad("Pick intern or supervisor.");
    }

    const taken = (await sql`select id from users where email = ${email}`) as {
      id: number;
    }[];
    if (taken.length) return bad("There is already an account on that email.");

    await sql`
      insert into users (
        email, name, password_hash, role, position, department, university,
        approved_at, approved_by
      ) values (
        ${email}, ${name}, ${await hashPassword(password)}, ${role},
        ${String(body.position ?? "").trim() || null},
        ${String(body.department ?? "").trim() || null},
        ${String(body.university ?? "").trim() || null},
        now(), ${admin.id}
      )
    `;

    return Response.json({ ok: true });
  } catch (err) {
    return asErrorResponse(err);
  }
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
