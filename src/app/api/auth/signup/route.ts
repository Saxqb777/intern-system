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
 * Anyone can reach this, so it does two things before it will create anything:
 * checks the email sits on an Agthia domain, and refuses to let the caller
 * choose their own role. Everybody lands as "pending" and waits for a
 * supervisor. The only way past that is the setup code, which exists once so
 * the very first system owner can be created.
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

    const domains = await getSetting("domains");
    if (!domains.includes(emailDomain(email))) {
      return bad(
        `Only Agthia addresses can sign up. Try your ${domains[0]} email.`
      );
    }

    const existing = (await sql`
      select id from users where email = ${email}
    `) as { id: number }[];
    if (existing.length) {
      return bad("There is already an account on that email. Sign in instead.");
    }

    // The setup code makes the first system owner. It only works while there
    // is no system owner at all, so it cannot be reused later to grab access.
    let role = "pending";
    if (setupCode) {
      const owners = (await sql`
        select id from users where role = 'superuser' limit 1
      `) as { id: number }[];

      const expected = process.env.SETUP_CODE;
      if (owners.length) {
        return bad("The system owner already exists. Ask them to approve you.");
      }
      if (!expected) {
        return bad("No setup code is configured on the server.");
      }
      if (setupCode !== expected) {
        return bad("That setup code is wrong.");
      }
      role = "superuser";
    }

    const hash = await hashPassword(password);
    const inserted = (await sql`
      insert into users (email, name, password_hash, role, position, department, university, approved_at)
      values (
        ${email}, ${name}, ${hash}, ${role}, ${position}, ${department}, ${university},
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
