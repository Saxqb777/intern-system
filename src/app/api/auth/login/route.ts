import { sql } from "@/lib/db";
import {
  asErrorResponse,
  normaliseEmail,
  startSession,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const form = (await request.json()) as Record<string, unknown>;
    const email = normaliseEmail(String(form.email ?? ""));
    const password = String(form.password ?? "");

    const rows = (await sql`
      select id, password_hash, role from users where email = ${email}
    `) as { id: number; password_hash: string; role: string }[];

    // Same message whichever half was wrong, so this page cannot be used to
    // find out which Agthia addresses have accounts.
    const wrong = Response.json(
      { error: "That email and password do not match." },
      { status: 401 }
    );

    if (!rows.length) return wrong;
    if (!(await verifyPassword(password, rows[0].password_hash))) return wrong;

    await startSession(rows[0].id);
    return Response.json({ ok: true, role: rows[0].role });
  } catch (err) {
    return asErrorResponse(err);
  }
}
