import { sql } from "@/lib/db";
import {
  asErrorResponse,
  emailDomain,
  hashPassword,
  normaliseEmail,
  startSession,
} from "@/lib/auth";
import { getSetting } from "@/lib/settings";

/**
 * Two doors lead here.
 *
 * Staff (/signup) have to be on an Agthia domain, and land as "pending" with
 * no access until a supervisor gives them a role. They never choose their own.
 *
 * An administrator (/owner) comes through with the setup code instead. That
 * code is a stronger gate than an email domain, so the domain check does not
 * apply: whoever runs this system is not necessarily an Agthia employee. It
 * only works while nobody owns the system, so it cannot be reused later to
 * grab access.
 */
export async function POST(request: Request) {
  try {
    const form = (await request.json()) as Record<string, unknown>;

    const name = String(form.name ?? "").trim();
    const email = normaliseEmail(String(form.email ?? ""));
    const password = String(form.password ?? "");
    const position = String(form.position ?? "").trim() || null;
    const department = String(form.department ?? "").trim() || null;
    const university = String(form.university ?? "").trim() || null;
    const setupCode = String(form.setupCode ?? "");

    if (name.length < 2) {
      return bad("Please put your full name in.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return bad("That does not look like an email address.");
    }
    if (password.length < 8) {
      return bad("Your password needs at least 8 characters.");
    }

    const existing = (await sql`
      select id from users where email = ${email}
    `) as { id: number }[];
    if (existing.length) {
      return bad("There is already an account on that email. Sign in instead.");
    }

    let role = "pending";

    if (setupCode) {
      const owners = (await sql`
        select id from users where role = 'superuser' limit 1
      `) as { id: number }[];

      if (owners.length) {
        return bad(
          "This system already has an owner. Ask them to approve your account instead."
        );
      }
      if (!process.env.SETUP_CODE) {
        return bad("No setup code is configured on the server.");
      }
      if (setupCode !== process.env.SETUP_CODE) {
        return bad("That setup code is wrong.");
      }
      role = "superuser";
    } else {
      // Staff door. Owners skip this on purpose, see the note above.
      const domains = await getSetting("domains");
      if (!domains.includes(emailDomain(email))) {
        return bad(
          `Only Agthia addresses can sign up here. Try your ${domains[0]} email.`
        );
      }
    }

    const inserted = (await sql`
      insert into users (email, name, password_hash, role, position, department, university, approved_at)
      values (
        ${email}, ${name}, ${await hashPassword(password)}, ${role},
        ${position}, ${department}, ${university},
        ${role === "superuser" ? new Date().toISOString() : null}
      )
      returning id
    `) as { id: number }[];

    await startSession(inserted[0].id);
    return Response.json({ ok: true, role });
  } catch (err) {
    return asErrorResponse(err);
  }
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
