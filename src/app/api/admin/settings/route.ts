import { asErrorResponse, requireUser } from "@/lib/auth";
import { setSetting } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    await requireUser("admin", "superuser");
    const body = (await request.json()) as Record<string, unknown>;
    const what = String(body.what ?? "");

    if (what === "office") {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const radius = Math.round(Number(body.radius));
      const label = String(body.label ?? "").trim() || "The office";

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return bad("That latitude is not a real coordinate.");
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return bad("That longitude is not a real coordinate.");
      }
      if (!Number.isFinite(radius) || radius < 25 || radius > 5000) {
        return bad("Pick a radius between 25 m and 5 km.");
      }

      await setSetting("office", { lat, lng, radius_m: radius, label });
      return Response.json({ ok: true });
    }

    if (what === "hours") {
      const start = String(body.start ?? "");
      const end = String(body.end ?? "");
      const time = /^\d{2}:\d{2}$/;

      if (!time.test(start) || !time.test(end)) {
        return bad("Times need to look like 09:00.");
      }
      if (end <= start) {
        return bad("The end of the day has to be after the start.");
      }

      await setSetting("hours", { start, end });
      return Response.json({ ok: true });
    }

    if (what === "internship") {
      const from = String(body.start_date ?? "");
      const to = String(body.end_date ?? "");
      const date = /^\d{4}-\d{2}-\d{2}$/;

      if (!date.test(from) || !date.test(to)) {
        return bad("Pick both dates.");
      }
      if (to < from) {
        return bad("The placement cannot end before it starts.");
      }

      await setSetting("internship", { start_date: from, end_date: to });
      return Response.json({ ok: true });
    }

    return bad("Unknown setting.");
  } catch (err) {
    return asErrorResponse(err);
  }
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
