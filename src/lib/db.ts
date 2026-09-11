import { neon, types } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  // Thrown at import time on purpose. A missing database URL is not something
  // to discover halfway through a request.
  throw new Error(
    "DATABASE_URL is not set. Add the Neon connection string in Vercel, or in .env.local for local work."
  );
}

// Postgres object ids for the three date-ish column types this app uses.
const DATE = 1082;
const TIMESTAMP = 1114;
const TIMESTAMPTZ = 1184;

const parseTimestamp = types.getTypeParser(TIMESTAMPTZ);

/**
 * Out of the box the driver turns every date column into a JavaScript Date.
 * This app carries dates around as strings all the way to the report
 * generator, so a Date arriving where a string was expected means calling
 * .slice() on an object, and a 500 on any page that renders one.
 *
 * So a DATE comes back as the plain "2026-09-11" Postgres already sent, and a
 * timestamp comes back as an ISO string. Parsing still runs through the
 * driver's own parser, which knows about fractional seconds and odd offsets;
 * we just hand on the ISO form rather than the object.
 */
const getTypeParser = ((oid: number, format?: "text" | "binary") => {
  if (oid === DATE) {
    return (value: string) => value;
  }

  if (oid === TIMESTAMP || oid === TIMESTAMPTZ) {
    return (value: string) => {
      const parsed: unknown = parseTimestamp(value);
      return parsed instanceof Date && !Number.isNaN(parsed.getTime())
        ? parsed.toISOString()
        : value;
    };
  }

  // Everything else keeps the driver's default behaviour.
  return format === "binary"
    ? types.getTypeParser(oid, "binary")
    : types.getTypeParser(oid);
}) as typeof types.getTypeParser;

export const sql = neon(process.env.DATABASE_URL, {
  types: { ...types, getTypeParser },
});
