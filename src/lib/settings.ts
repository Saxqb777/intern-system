import { cache } from "react";
import { sql } from "@/lib/db";
import type { Hours, Internship, Office } from "@/lib/types";

type SettingsShape = {
  office: Office;
  hours: Hours;
  internship: Internship;
  domains: string[];
};

/**
 * The office has no coordinates until somebody stands in it and sets them.
 * Guessing would be worse than admitting it: a fence in the wrong place
 * refuses the people who are actually at work.
 */
const FALLBACK: SettingsShape = {
  office: { lat: null, lng: null, radius_m: 200, label: "the office" },
  hours: { start: "09:00", end: "17:00" },
  internship: { start_date: "2026-09-07", end_date: "2026-12-04" },
  domains: ["agthia.com", "agthia.ae", "alfoah.com"],
};

/**
 * Every setting in one round trip, cached for the life of the request.
 *
 * Written settings are not read back in the same request anywhere, so the
 * cache cannot serve a stale value after a write. Keep it that way.
 */
export const allSettings = cache(async function allSettings(): Promise<SettingsShape> {
  const rows = (await sql`select key, value from settings`) as {
    key: keyof SettingsShape;
    value: unknown;
  }[];

  const loaded = { ...FALLBACK };
  for (const row of rows) {
    if (row.key in loaded && row.value != null) {
      (loaded as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return loaded;
});

export async function getSetting<K extends keyof SettingsShape>(
  key: K
): Promise<SettingsShape[K]> {
  return (await allSettings())[key];
}

export async function setSetting<K extends keyof SettingsShape>(
  key: K,
  value: SettingsShape[K]
): Promise<void> {
  await sql`
    insert into settings (key, value)
    values (${key}, ${JSON.stringify(value)}::jsonb)
    on conflict (key) do update set value = excluded.value
  `;
}

/** An office with real coordinates. Null until somebody sets it. */
export function placedOffice(
  office: Office
): { lat: number; lng: number; radius_m: number; label: string } | null {
  return typeof office.lat === "number" && typeof office.lng === "number"
    ? { lat: office.lat, lng: office.lng, radius_m: office.radius_m, label: office.label }
    : null;
}

/** Minutes in a full working day, from the configured start and end. */
export function workdayMinutes(hours: Hours): number {
  const [sh, sm] = hours.start.split(":").map(Number);
  const [eh, em] = hours.end.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  return total > 0 ? total : 480;
}
