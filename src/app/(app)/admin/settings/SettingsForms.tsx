"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Hours, Internship, Office } from "@/lib/types";

export function SettingsForms({
  office,
  hours,
  internship,
}: {
  office: Office;
  hours: Hours;
  internship: Internship;
}) {
  return (
    <div className="stack-l">
      <OfficeForm office={office} />
      <HoursForm hours={hours} />
      <InternshipForm internship={internship} />
    </div>
  );
}

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not save that.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return { save, busy, error, saved, setError };
}

function OfficeForm({ office }: { office: Office }) {
  const { save, busy, error, saved, setError } = useSave();
  const [lat, setLat] = useState(String(office.lat));
  const [lng, setLng] = useState(String(office.lng));
  const [radius, setRadius] = useState(String(office.radius_m));
  const [label, setLabel] = useState(office.label);
  const [locating, setLocating] = useState(false);

  /**
   * The easiest way to get this right: stand in the office and press the
   * button. Beats hunting for coordinates on a map.
   */
  function useHere() {
    if (!("geolocation" in navigator)) {
      setError("This browser cannot do location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not read your location. Allow it and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20_000 }
    );
  }

  return (
    <section className="panel">
      <header>
        <div>
          <h2>Where the office is</h2>
          <p className="small faint">
            Attendance only works inside this circle.
          </p>
        </div>
      </header>
      <div className="body stack">
        {error && <p className="note bad">{error}</p>}
        {saved && !error && <p className="note good">Saved.</p>}

        <p className="note plain">
          Stand anywhere in the office and press the button below. That is far
          more accurate than dropping a pin on a map, and it takes two seconds.
        </p>

        <div>
          <button className="btn" onClick={useHere} disabled={locating}>
            {locating ? "Finding you" : "Use where I am standing now"}
          </button>
        </div>

        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field grow" style={{ minWidth: 140 }}>
            <label htmlFor="lat">Latitude</label>
            <input id="lat" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="field grow" style={{ minWidth: 140 }}>
            <label htmlFor="lng">Longitude</label>
            <input id="lng" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label htmlFor="radius">Radius in metres</label>
            <input
              id="radius"
              type="number"
              min={25}
              max={5000}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="label">What to call it</label>
          <input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <p className="help">
            Shown to interns, so make it something they recognise.
          </p>
        </div>

        <div>
          <button
            className="btn solid"
            disabled={busy}
            onClick={() =>
              save({ what: "office", lat, lng, radius, label })
            }
          >
            {busy ? "Saving" : "Save location"}
          </button>
        </div>
      </div>
    </section>
  );
}

function HoursForm({ hours }: { hours: Hours }) {
  const { save, busy, error, saved } = useSave();
  const [start, setStart] = useState(hours.start);
  const [end, setEnd] = useState(hours.end);

  return (
    <section className="panel">
      <header>
        <div>
          <h2>Working day</h2>
          <p className="small faint">
            Sets the dial, and what counts as arriving late.
          </p>
        </div>
      </header>
      <div className="body stack">
        {error && <p className="note bad">{error}</p>}
        {saved && !error && <p className="note good">Saved.</p>}

        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ width: 140 }}>
            <label htmlFor="start">Starts</label>
            <input
              id="start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label htmlFor="end">Ends</label>
            <input
              id="end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <button
            className="btn solid"
            disabled={busy}
            onClick={() => save({ what: "hours", start, end })}
          >
            {busy ? "Saving" : "Save hours"}
          </button>
        </div>

        <p className="small faint">
          Arriving more than ten minutes after the start counts as late on the
          summary.
        </p>
      </div>
    </section>
  );
}

function InternshipForm({ internship }: { internship: Internship }) {
  const { save, busy, error, saved } = useSave();
  const [from, setFrom] = useState(internship.start_date);
  const [to, setTo] = useState(internship.end_date);

  return (
    <section className="panel">
      <header>
        <div>
          <h2>Placement dates</h2>
          <p className="small faint">
            The default range on every report, and where week 1 starts.
          </p>
        </div>
      </header>
      <div className="body stack">
        {error && <p className="note bad">{error}</p>}
        {saved && !error && <p className="note good">Saved.</p>}

        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="istart">First day</label>
            <input
              id="istart"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="iend">Last day</label>
            <input
              id="iend"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            className="btn solid"
            disabled={busy}
            onClick={() =>
              save({ what: "internship", start_date: from, end_date: to })
            }
          >
            {busy ? "Saving" : "Save dates"}
          </button>
        </div>
      </div>
    </section>
  );
}
