/**
 * Which build is actually serving this request.
 *
 * Exists because deployment URLs, branch aliases and the production alias can
 * all point at different commits, and a page that throws looks identical
 * whichever one you are on. Open this and the guessing stops.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return Response.json(
    {
      commit: sha ? sha.slice(0, 7) : "unknown (not running on Vercel)",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null,
      environment: process.env.VERCEL_ENV ?? "local",
      region: process.env.VERCEL_REGION ?? null,
      servedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
