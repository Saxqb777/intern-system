"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import {
  dayOf,
  dayShort,
  humanMinutes,
  minutesBetween,
  officeTime,
  sheetDate,
  niceDate,
  sheetDays,
} from "@/lib/dates";

type Row = {
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  note: string | null;
  signed: boolean;
  signed_at: string | null;
  signed_by_name: string | null;
  in_distance: number | null;
  out_distance: number | null;
  in_override: boolean;
  out_override: boolean;
  edited_by: number | null;
};

export function SheetView({
  canSign,
  internName,
  interns,
  selectedId,
  from,
  to,
  rows,
  dayMinutes,
  today,
}: {
  canSign: boolean;
  internName: string;
  interns: { id: number; name: string }[];
  selectedId: number;
  from: string;
  to: string;
  rows: Row[];
  dayMinutes: number;
  today: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [editing, setEditing] = useState<string | null>(null);

  function go(patch: Record<string, string>) {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(patch)) next.set(key, value);
    router.push(`/admin/sheet?${next.toString()}`);
  }

  const byDate = new Map(rows.map((r) => [dayOf(r.work_date), r]));
  const days = sheetDays(from, to, byDate.keys());
  const reportUrl = `/api/report?intern=${selectedId}&from=${from}&to=${to}`;

  const unsigned = days
    .map((day) => byDate.get(day))
    .filter((row): row is Row => Boolean(row?.time_out && !row.signed))
    .map((row) => dayOf(row.work_date));

  return (
    <>
      {canSign && unsigned.length > 0 && (
        <SignOffPanel
          internId={selectedId}
          internName={internName}
          dates={unsigned}
          onDone={() => router.refresh()}
        />
      )}

      <section className="panel">
        <header>
          <div className="row">
            <div className="field" style={{ minWidth: 180 }}>
              <label htmlFor="whoo">Intern</label>
              <select
                id="whoo"
                value={selectedId}
                onChange={(e) => go({ intern: e.target.value })}
              >
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ width: 160 }}>
              <label htmlFor="fromd">From</label>
              <input
                id="fromd"
                type="date"
                value={from}
                onChange={(e) => go({ from: e.target.value })}
              />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label htmlFor="tod">To</label>
              <input
                id="tod"
                type="date"
                value={to}
                onChange={(e) => go({ to: e.target.value })}
              />
            </div>
          </div>

          <a className="btn solid" href={reportUrl} download>
            Download the sheet
          </a>
        </header>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Time in</th>
                <th>Time out</th>
                <th>Hours</th>
                <th>Signature</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const row = byDate.get(day);
                const worked = minutesBetween(
                  row?.time_in ?? null,
                  row?.time_out ?? null
                );
                const future = day > today;

                if (editing === day) {
                  return (
                    <EditRow
                      key={day}
                      day={day}
                      row={row}
                      userId={selectedId}
                      onDone={() => {
                        setEditing(null);
                        router.refresh();
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  );
                }

                return (
                  <tr key={day} className={day === today ? "today" : undefined}>
                    <td>{dayShort(day)}</td>
                    <td className="dim">{sheetDate(day)}</td>
                    <td className="num">
                      {row?.status === "leave" ? (
                        <span style={{ color: "var(--amber-ink)", fontWeight: 600 }}>
                          Approved leave
                        </span>
                      ) : (
                        officeTime(row?.time_in ?? null) ?? dash(future)
                      )}
                    </td>
                    <td className="num">
                      {row?.status === "leave"
                        ? ""
                        : (officeTime(row?.time_out ?? null) ?? dash(future))}
                    </td>
                    <td className="num">
                      {worked ? (
                        <span
                          style={{
                            color:
                              worked < dayMinutes * 0.75
                                ? "var(--amber-ink)"
                                : "inherit",
                          }}
                        >
                          {humanMinutes(worked)}
                        </span>
                      ) : (
                        dash(future)
                      )}
                    </td>
                    <td className="dim">
                      {row?.signed ? (
                        <span style={{ color: "var(--green-ink)" }}>
                          {row.signed_by_name ?? "Signed"}
                        </span>
                      ) : row?.time_out ? (
                        <span style={{ color: "var(--amber-ink)" }}>
                          Awaiting signature
                        </span>
                      ) : (
                        dash(future)
                      )}
                      {(row?.in_override || row?.out_override) && (
                        <span className="pill wait" style={{ marginInlineStart: 6 }}>
                          override
                        </span>
                      )}
                      {row?.edited_by && (
                        <span className="pill off" style={{ marginInlineStart: 6 }}>
                          edited
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "end" }}>
                      {!future && (
                        <button
                          className="btn ghost tiny"
                          onClick={() => setEditing(day)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="small faint">
        The download is a Word file laid out exactly like the sheet the
        university sent, filled in from the rows above. Edits are stamped with
        who made them.
      </p>
    </>
  );
}

function dash(future: boolean) {
  return <span className="faint">{future ? "" : "———"}</span>;
}

function EditRow({
  day,
  row,
  userId,
  onDone,
  onCancel,
}: {
  day: string;
  row: Row | undefined;
  userId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [timeIn, setTimeIn] = useState(officeTime(row?.time_in ?? null) ?? "");
  const [timeOut, setTimeOut] = useState(officeTime(row?.time_out ?? null) ?? "");
  const [status, setStatus] = useState(row?.status ?? "present");
  const [note, setNote] = useState(row?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        date: day,
        timeIn: status === "present" || status === "edited" ? timeIn : "",
        timeOut: status === "present" || status === "edited" ? timeOut : "",
        status: status === "present" && (timeIn || timeOut) ? "edited" : status,
        note,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not save that.");
      return;
    }
    onDone();
  }

  return (
    <tr style={{ background: "var(--sunk)" }}>
      <td colSpan={7} style={{ padding: "16px 14px" }}>
        <div className="stack-s">
          {error && <p className="note bad">{error}</p>}
          <div className="row" style={{ alignItems: "flex-end" }}>
            <span className="mono small faint" style={{ width: 110 }}>
              {sheetDate(day)}
            </span>
            <div className="field" style={{ width: 130 }}>
              <label htmlFor={`s${day}`}>Status</label>
              <select
                id={`s${day}`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="present">Present</option>
                <option value="leave">Approved leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor={`i${day}`}>In</label>
              <input
                id={`i${day}`}
                type="time"
                value={timeIn}
                disabled={status !== "present"}
                onChange={(e) => setTimeIn(e.target.value)}
              />
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor={`o${day}`}>Out</label>
              <input
                id={`o${day}`}
                type="time"
                value={timeOut}
                disabled={status !== "present"}
                onChange={(e) => setTimeOut(e.target.value)}
              />
            </div>
            <div className="field grow" style={{ minWidth: 160 }}>
              <label htmlFor={`n${day}`}>Note</label>
              <input
                id={`n${day}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
               
              />
            </div>
            <button className="btn solid" disabled={busy} onClick={save}>
              {busy ? "Saving" : "Save"}
            </button>
            <button className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/**
 * A supervisor certifying days from their own account.
 *
 * They draw once and choose which days it covers. Every outstanding day is
 * ticked to begin with, because signing off a week at a time is the normal
 * case and re-drawing the same signature five times is not more truthful
 * than drawing it once on purpose.
 */
function SignOffPanel({
  internId,
  internName,
  dates,
  onDone,
}: {
  internId: number;
  internName: string;
  dates: string[];
  onDone: () => void;
}) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [chosen, setChosen] = useState<string[]>(dates);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(day: string) {
    setChosen((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort()
    );
  }

  async function submit() {
    const signature = padRef.current?.toDataUrl();
    if (!signature) {
      setError("Draw your signature in the box first.");
      return;
    }
    if (chosen.length === 0) {
      setError("Tick at least one day.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: internId, dates: chosen, signature }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not save that.");
      return;
    }
    padRef.current?.clear();
    onDone();
  }

  return (
    <section className="panel signoff">
      <header>
        <div>
          <h2>
            {dates.length} {dates.length === 1 ? "day" : "days"} need your
            signature
          </h2>
          <p className="small faint">
            {internName} has signed out of these. Nothing reaches the sheet
            until you certify them.
          </p>
        </div>
      </header>

      <div className="body stack">
        {error && <p className="note bad">{error}</p>}

        <div className="daypicks">
          {dates.map((day) => (
            <label key={day} className={chosen.includes(day) ? "on" : undefined}>
              <input
                type="checkbox"
                checked={chosen.includes(day)}
                onChange={() => toggle(day)}
              />
              <b>{dayShort(day)}</b>
              <span>{niceDate(day)}</span>
            </label>
          ))}
        </div>

        <div className="field">
          <label htmlFor="signoff-pad">Your signature</label>
          <SignaturePad ref={padRef} />
        </div>

        <div className="spread">
          <span className="small faint">
            {chosen.length} of {dates.length} ticked
          </span>
          <button className="btn solid" onClick={submit} disabled={busy}>
            {busy
              ? "Signing"
              : `Sign ${chosen.length} ${chosen.length === 1 ? "day" : "days"}`}
          </button>
        </div>
      </div>
    </section>
  );
}
