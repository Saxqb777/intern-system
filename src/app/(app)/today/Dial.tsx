"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "@/components/Leaf";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { metresBetween } from "@/lib/geo";
import { humanMinutes, minutesBetween, officeTime } from "@/lib/dates";

const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Fix = { lat: number; lng: number; accuracy: number };
type GeoState =
  | { kind: "looking" }
  | { kind: "denied" }
  | { kind: "failed"; message: string }
  | { kind: "found"; fix: Fix; distance: number };

type Props = {
  timeIn: string | null;
  timeOut: string | null;
  hasSignature: boolean;
  officeLabel: string;
  radius: number;
  officeLat: number;
  officeLng: number;
  dayMinutes: number;
  startsAt: string;
  endsAt: string;
  testMode: boolean;
  /** Owner is demonstrating the refusal without leaving the building. */
  simulateOutside: boolean;
  pendingOverride: boolean;
  alreadyWorked: number;
};

export function Dial(props: Props) {
  const router = useRouter();

  const [geo, setGeo] = useState<GeoState>({ kind: "looking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signOutAt, setSignOutAt] = useState<string | null>(null);
  // Starts at the figure the server worked out, so the first paint matches what
  // was sent down. The effect below corrects it to live once we are in a browser.
  const [elapsed, setElapsed] = useState(props.alreadyWorked);

  const signOutDialog = useRef<HTMLDialogElement>(null);
  const overrideDialog = useRef<HTMLDialogElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const state: "out" | "in" | "done" = props.timeOut
    ? "done"
    : props.timeIn
      ? "in"
      : "out";

  // Follow the phone rather than asking once, so the chip stays honest while
  // they walk from the car park to the desk.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeo({ kind: "failed", message: "This browser cannot do location." });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setGeo({
          kind: "found",
          fix,
          distance: metresBetween(
            fix.lat,
            fix.lng,
            props.officeLat,
            props.officeLng
          ),
        });
      },
      (err) => {
        setGeo(
          err.code === err.PERMISSION_DENIED
            ? { kind: "denied" }
            : {
                kind: "failed",
                message:
                  err.code === err.TIMEOUT
                    ? "Your phone is taking too long to find you."
                    : "Your phone could not work out where it is.",
              }
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [props.officeLat, props.officeLng]);

  // Tick the ring while they are signed in.
  useEffect(() => {
    if (state !== "in" || !props.timeIn) return;

    const tick = () =>
      setElapsed(minutesBetween(props.timeIn, new Date().toISOString()));

    tick();
    const timer = setInterval(tick, 20_000);
    return () => clearInterval(timer);
  }, [state, props.timeIn]);

  const inside = props.simulateOutside
    ? false
    : props.testMode || (geo.kind === "found" && geo.distance <= props.radius);

  const canPunch = state !== "done" && (props.testMode || geo.kind === "found");

  const send = useCallback(
    async (action: "in" | "out", signature?: string) => {
      setBusy(true);
      setError(null);

      const fix = geo.kind === "found" ? geo.fix : null;
      const res = await fetch("/api/punch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          lat: fix?.lat,
          lng: fix?.lng,
          accuracy: fix?.accuracy,
          signature,
        }),
      });
      const body = (await res.json()) as { error?: string };

      setBusy(false);
      if (!res.ok) {
        setError(body.error ?? "That did not work.");
        return false;
      }
      router.refresh();
      return true;
    },
    [geo, router]
  );

  async function onPunch() {
    if (state === "out") {
      await send("in");
      setElapsed(0);
    } else if (state === "in") {
      setSignOutAt(officeTime(new Date()));
      signOutDialog.current?.showModal();
    }
  }

  async function confirmSignOut() {
    const signature = padRef.current?.toDataUrl() ?? undefined;
    if (!signature) {
      setError("Please sign in the box before you sign out.");
      return;
    }
    const ok = await send("out", signature);
    if (ok) signOutDialog.current?.close();
  }

  const progress = Math.min(elapsed / props.dayMinutes, 1);

  return (
    <div className="stack" style={{ maxWidth: 430, marginInline: "auto" }}>
      {error && <p className="note bad">{error}</p>}

      {props.testMode && !props.simulateOutside && (
        <p className="note warn">
          Test mode is on, so the office fence is switched off and you can sign
          in from anywhere. Turn it off before the interns start.
        </p>
      )}

      <div className="dialwrap">
        <div className="dial">
          <svg className="ring" viewBox="0 0 272 272" aria-hidden="true">
            <circle className="track" cx="136" cy="136" r={RADIUS} />
            <circle
              className="prog"
              cx="136"
              cy="136"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - CIRCUMFERENCE * progress}
            />
          </svg>

          <button
            className="punch"
            data-state={state}
            onClick={onPunch}
            disabled={busy || !canPunch || !inside}
          >
            <Leaf className="leaf" />
            <span className="word">{wordFor(state, busy)}</span>
            <span className="hint">{hintFor(state, props, elapsed, inside)}</span>
          </button>
        </div>
      </div>

      <LocationChip
        geo={geo}
        radius={props.radius}
        label={props.officeLabel}
        testMode={props.testMode}
        simulateOutside={props.simulateOutside}
      />

      {!inside && state !== "done" && (
        <OutsideNote
          pending={props.pendingOverride}
          onAsk={() => overrideDialog.current?.showModal()}
        />
      )}

      <dl className="stamps">
        <div>
          <dt>In</dt>
          <dd className={props.timeIn ? "" : "blank"}>
            {officeTime(props.timeIn) ?? "———"}
          </dd>
        </div>
        <div>
          <dt>Out</dt>
          <dd className={props.timeOut ? "" : "blank"}>
            {officeTime(props.timeOut) ?? "———"}
          </dd>
        </div>
        <div>
          <dt>Today</dt>
          <dd>{humanMinutes(elapsed)}</dd>
        </div>
      </dl>

      <p className="small faint" style={{ textAlign: "center" }}>
        Your day runs {props.startsAt} to {props.endsAt}.
      </p>

      {/* ---- sign out ---- */}
      <dialog className="sheet" ref={signOutDialog}>
        <div className="inner">
          <div>
            <p className="eyebrow">
              {signOutAt ? `Signing out at ${signOutAt}` : "End of day"}
            </p>
            <h2>Sign the day off</h2>
          </div>
          <p className="lede small">
            Draw your signature the way you would on the paper sheet. It goes
            straight onto the form your university sees.
          </p>

          <SignaturePad ref={padRef} />

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn ghost"
              onClick={() => signOutDialog.current?.close()}
            >
              Not yet
            </button>
            <button className="btn solid" onClick={confirmSignOut} disabled={busy}>
              {busy ? "Saving" : "Sign out"}
            </button>
          </div>
        </div>
      </dialog>

      {/* ---- ask for an override ---- */}
      <OverrideDialog
        ref={overrideDialog}
        fix={geo.kind === "found" ? geo.fix : null}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function wordFor(state: string, busy: boolean): string {
  if (busy) return "Wait";
  if (state === "out") return "Sign in";
  if (state === "in") return "Sign out";
  return "Done";
}

function hintFor(
  state: string,
  props: Props,
  elapsed: number,
  inside: boolean
): string {
  if (state === "done") return "Signed off for today";
  if (!inside) return "Not at the office";
  if (state === "in") return `In since ${officeTime(props.timeIn)}`;
  return "Tap to start your day";
}

function LocationChip({
  geo,
  radius,
  label,
  testMode,
  simulateOutside,
}: {
  geo: GeoState;
  radius: number;
  label: string;
  testMode: boolean;
  simulateOutside: boolean;
}) {
  if (simulateOutside) {
    return (
      <div className="geo off">
        <span className="dot" />
        <span className="grow">
          <b>Away from {label}</b>
          <span>4.2 km from centre &middot; accuracy 14 m</span>
        </span>
      </div>
    );
  }

  if (testMode) {
    return (
      <div className="geo unknown">
        <span className="dot" />
        <span className="grow">
          <b>Location check is off</b>
          <span>Test mode</span>
        </span>
      </div>
    );
  }

  if (geo.kind === "looking") {
    return (
      <div className="geo unknown">
        <span className="dot" />
        <span className="grow">
          <b>Finding you</b>
          <span>Allow location if your phone asks</span>
        </span>
      </div>
    );
  }

  if (geo.kind === "denied") {
    return (
      <div className="geo off">
        <span className="dot" />
        <span className="grow">
          <b>Location is blocked</b>
          <span>Turn it on for this site in your browser settings</span>
        </span>
      </div>
    );
  }

  if (geo.kind === "failed") {
    return (
      <div className="geo off">
        <span className="dot" />
        <span className="grow">
          <b>No location</b>
          <span>{geo.message}</span>
        </span>
      </div>
    );
  }

  const inside = geo.distance <= radius;
  return (
    <div className={inside ? "geo" : "geo off"}>
      <span className="dot" />
      <span className="grow">
        <b>{inside ? `At ${label}` : `Away from ${label}`}</b>
        <span>
          {formatDistance(geo.distance)} from centre &middot; accuracy{" "}
          {Math.round(geo.fix.accuracy)} m
        </span>
      </span>
    </div>
  );
}

function OutsideNote({
  pending,
  onAsk,
}: {
  pending: boolean;
  onAsk: () => void;
}) {
  if (pending) {
    return (
      <p className="note warn">
        Your supervisor has your request and will decide shortly. Nothing has
        been recorded yet.
      </p>
    );
  }
  return (
    <div className="note warn">
      <p style={{ marginBottom: 9 }}>
        Attendance is locked because you are not at the office.
      </p>
      <button className="btn tiny warn" onClick={onAsk}>
        Ask your supervisor to allow it
      </button>
    </div>
  );
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/** React 19 lets a ref ride in as a normal prop, so no forwardRef ceremony. */
function OverrideDialog({
  ref,
  fix,
  onDone,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  fix: Fix | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"in" | "out">("in");
  const [reason, setReason] = useState("");

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/override", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        reason,
        lat: fix?.lat,
        lng: fix?.lng,
        accuracy: fix?.accuracy,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Could not send that.");
      return;
    }
    ref.current?.close();
    setReason("");
    onDone();
  }

  return (
    <dialog className="sheet" ref={ref}>
      <div className="inner">
        <div>
          <p className="eyebrow">Outside the office</p>
          <h2>Ask to be let in</h2>
        </div>
        <p className="lede small">
          Your supervisor sees this straight away. Say where you actually are
          and why, so they can decide.
        </p>

        {error && <p className="note bad">{error}</p>}

        <div className="field">
          <label htmlFor="ovkind">This is for</label>
          <select
            id="ovkind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "in" | "out")}
          >
            <option value="in">Signing in</option>
            <option value="out">Signing out</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="ovreason">What happened</label>
          <textarea
            id="ovreason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Working at the Al Saad site today with Khalid, GPS will not lock inside the cold store."
          />
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button className="btn warn" onClick={submit} disabled={busy}>
            {busy ? "Sending" : "Send request"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
