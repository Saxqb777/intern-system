import { asErrorResponse, requireUser } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { seedDemo, wipeDemo } from "@/lib/demo";

/** Test mode and demo data. Only the system owner gets in here. */
export async function POST(request: Request) {
  try {
    const owner = await requireUser("superuser");
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "seed") {
      const result = await seedDemo(owner.name);
      await setSetting("test_mode", { on: true });
      return Response.json({ ok: true, ...result });
    }

    if (action === "wipe") {
      await wipeDemo();
      return Response.json({ ok: true });
    }

    if (action === "test_on") {
      await setSetting("test_mode", { on: true });
      return Response.json({ ok: true });
    }

    if (action === "go_live") {
      // Going live means the fence is enforced and nothing demo remains, so
      // the two happen together rather than as two things to remember.
      await wipeDemo();
      await setSetting("test_mode", { on: false });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    return asErrorResponse(err);
  }
}
