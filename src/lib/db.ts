import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  // Thrown at import time on purpose. A missing database URL is not something
  // to discover halfway through a request.
  throw new Error(
    "DATABASE_URL is not set. Add the Neon connection string in Vercel, or in .env.local for local work."
  );
}

export const sql = neon(process.env.DATABASE_URL);
