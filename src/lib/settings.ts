import { sql } from "@/lib/db";
import type { Hours, Internship, Office } from "@/lib/types";

type SettingsShape = {
  office: Office;
  hours: Hours;
  internship: Internship;
  test_mode: { on: boolean; simulate_outside?: boolean };
  domains: string[];
};

const FALLBACK: SettingsShape = {
  office: {
    lat: 24.1302,
    lng: 55.8023,
    radius_m: 200,
    label: "Agthia Al Foah, Al Ain",
  },
  hours: { start: "09:00", end: "17:00" },
  internship: { start_date: "2026-09-07", end_date: "2026-12-04" },
  test_mode: { on: true, simulate_outside: false },
  domains: ["agthia.com", "agthia.ae", "alfoah.com"],
};

export async function getSetting<K extends keyof SettingsShape>(
  key: K
): Promise<SettingsShape[K]> {
  const rows = (await sql`select value from settings where key = ${key}`) as {
    value: SettingsShape[K];
  }[];
  return rows[0]?.value ?? FALLBACK[key];
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

export async function isTestMode(): Promise<boolean> {
  return (await getSetting("test_mode")).on;
}

/** Minutes in a full working day, from the configured start and end. */
export function workdayMinutes(hours: Hours): number {
  const [sh, sm] = hours.start.split(":").map(Number);
  const [eh, em] = hours.end.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  return total > 0 ? total : 480;
}
