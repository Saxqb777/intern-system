import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  // Thrown at import time on purpose. A missing database URL is not something
  // to discover halfway through a request.
  throw new Error(
    "DATABASE_URL is not set. Add the Neon connection string in Vercel, or in .env.local for local work."
  );
}

/**
 * The driver parses date, timestamp and timestamptz columns into JavaScript
 * Date objects, and there is no way to change that here: neon() accepts only
 * arrayMode, fullResults, fetchOptions, isolationLevel, readOnly, deferrable,
 * queryCallback, resultCallback and authToken. A `types` option type-checks,
 * because the declaration file declares it for Pool, but the HTTP driver
 * ignores it at runtime.
 *
 * So date columns are normalised where they are read instead. Anything that
 * needs the calendar day out of one goes through dayOf() in lib/dates, which
 * accepts a Date or a string and always hands back "YYYY-MM-DD".
 */
export const sql = neon(process.env.DATABASE_URL);
