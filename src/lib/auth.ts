import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import type { Role, User } from "@/lib/types";

const COOKIE = "alfoah_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. It needs at least 32 characters. Generate one with: openssl rand -base64 48"
    );
  }
  return new TextEncoder().encode(raw);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function startSession(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user, or null. Safe to call from anywhere on the server. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  let uid: number;
  try {
    const { payload } = await jwtVerify(token, secret());
    uid = Number(payload.uid);
  } catch {
    return null;
  }
  if (!Number.isFinite(uid)) return null;

  const rows = (await sql`
    select id, email, name, role, position, department, mentor, university,
           created_at, is_demo
    from users where id = ${uid}
  `) as User[];

  return rows[0] ?? null;
}

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "superuser";
}

/**
 * Guard for route handlers. Returns the user, or throws a Response the
 * handler can return straight back to the browser.
 */
export async function requireUser(...allowed: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user) {
    throw Response.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (allowed.length && !allowed.includes(user.role)) {
    throw Response.json(
      { error: "Your account cannot do that." },
      { status: 403 }
    );
  }
  return user;
}

/** Turns a thrown Response back into a response, and anything else into a 500. */
export function asErrorResponse(err: unknown): Response {
  if (err instanceof Response) return err;
  console.error(err);
  return Response.json(
    { error: "Something went wrong on our side. Try again." },
    { status: 500 }
  );
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}
