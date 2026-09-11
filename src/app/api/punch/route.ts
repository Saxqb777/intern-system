import { sql } from "@/lib/db";
import { asErrorResponse, requireUser } from "@/lib/auth";
import { MAX_ACCURACY_M, metresBetween, parseFix } from "@/lib/geo";
import { getSetting } from "@/lib/settings";
import { officeToday } from "@/lib/dates";

type Body = {
  action?: "in" | "out";
  lat?: unknown;
  lng?: unknown;
  accuracy?: unknown;
  signature?: unknown;
};

/**
 * Sign in and sign out. The browser hands us a position, but the decision about
 * whether that position is inside the fence is made here and never in the
 * browser, because anything the browser decides can be edited by the person
 * being measured.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser("intern");
    const body = (await request.json()) as Body;

    const action = body.action === "out" ? "out" : "in";
    const today = officeToday();
    const test = await getSetting("test_mode");
    const testMode = test.on;
    const office = await getSetting("office");

    const fix = parseFix({
      lat: body.lat,
      lng: body.lng,
      accuracy: body.accuracy,
    });

    // In test mode we skip the fence so the system can be demonstrated away
    // from Al Foah. Everything else behaves exactly as it will when live.
    let distance: number | null = null;

    // Except when the owner has asked test mode to pretend they are out of
    // range, so the refusal itself can be shown to someone without driving
    // away from the building.
    if (testMode && test.simulate_outside) {
      return refuse(
        `You are 4.2 km from the office. Attendance only works inside ${office.radius_m} m of ${office.label}.`,
        { distance: 4200, outside: true }
      );
    }

    if (!testMode) {
      if (!fix) {
        return refuse(
          "We could not read your location. Turn location on for this site and try again."
        );
      }
      if (fix.accuracy > MAX_ACCURACY_M) {
        return refuse(
          `Your phone is only sure of your position to within ${Math.round(fix.accuracy)} m, which is too rough to trust. Step outside or near a window and try again.`,
          { accuracy: fix.accuracy }
        );
      }

      distance = metresBetween(fix.lat, fix.lng, office.lat, office.lng);
      if (distance > office.radius_m) {
        return refuse(
          `You are ${formatDistance(distance)} from the office. Attendance only works inside ${office.radius_m} m of ${office.label}.`,
          { distance, outside: true }
        );
      }
    } else if (fix) {
      distance = metresBetween(fix.lat, fix.lng, office.lat, office.lng);
    }

    const ip = clientIp(request);
    const now = new Date().toISOString();

    const existing = (await sql`
      select id, time_in, time_out from attendance
      where user_id = ${user.id} and work_date = ${today}
    `) as { id: number; time_in: string | null; time_out: string | null }[];

    if (action === "in") {
      if (existing[0]?.time_in) {
        return refuse("You already signed in today.");
      }

      await sql`
        insert into attendance (
          user_id, work_date, time_in,
          in_lat, in_lng, in_accuracy, in_distance, in_ip, is_demo
        ) values (
          ${user.id}, ${today}, ${now},
          ${fix?.lat ?? null}, ${fix?.lng ?? null}, ${fix?.accuracy ?? null},
          ${distance}, ${ip}, ${testMode}
        )
        on conflict (user_id, work_date) do update set
          time_in     = excluded.time_in,
          in_lat      = excluded.in_lat,
          in_lng      = excluded.in_lng,
          in_accuracy = excluded.in_accuracy,
          in_distance = excluded.in_distance,
          in_ip       = excluded.in_ip,
          -- They turned up on a day booked as leave. They were here, so the
          -- day counts as worked and the sheet shows the real hours.
          status      = 'present'
      `;

      return Response.json({ ok: true, at: now, distance });
    }

    // Signing out.
    if (!existing[0]?.time_in) {
      return refuse("You have not signed in today, so there is nothing to sign out of.");
    }
    if (existing[0].time_out) {
      return refuse("You already signed out today.");
    }

    const signature =
      typeof body.signature === "string" && body.signature.startsWith("data:image/")
        ? body.signature.slice(0, 200_000)
        : null;

    await sql`
      update attendance set
        time_out     = ${now},
        out_lat      = ${fix?.lat ?? null},
        out_lng      = ${fix?.lng ?? null},
        out_accuracy = ${fix?.accuracy ?? null},
        out_distance = ${distance},
        out_ip       = ${ip},
        signature    = coalesce(${signature}, signature)
      where id = ${existing[0].id}
    `;

    return Response.json({ ok: true, at: now, distance });
  } catch (err) {
    return asErrorResponse(err);
  }
}

function refuse(message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status: 422 });
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/**
 * Stored alongside every punch. It will not stop somebody determined to fake a
 * location, but a punch from a phone network on the other side of the country
 * leaves a trace the supervisor can see.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
