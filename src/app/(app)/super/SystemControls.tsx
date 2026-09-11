"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SystemControls({
  testMode,
  demoRows,
  officeLabel,
  radius,
  demoPassword,
  demoEmails,
}: {
  testMode: boolean;
  demoRows: number;
  officeLabel: string;
  radius: number;
  demoPassword: string;
  demoEmails: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(action: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;

    setBusy(action);
    setError(null);
    setDone(null);

    const res = await fetch("/api/super", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json()) as {
      error?: string;
      people?: number;
      days?: number;
    };
    setBusy(null);

    if (!res.ok) {
      setError(body.error ?? "That did not work.");
      return;
    }

    if (action === "seed") {
      setDone(`Made ${body.people} demo interns and ${body.days} days of attendance.`);
    } else if (action === "go_live") {
      setDone("Live. The fence is on and the demo data is gone.");
    } else if (action === "wipe") {
      setDone("Demo data removed.");
    } else {
      setDone("Test mode is on.");
    }
    router.refresh();
  }

  return (
    <>
      <section className="panel">
        <header>
          <div>
            <h2>{testMode ? "Running in test mode" : "Live"}</h2>
            <p className="small faint">
              {testMode
                ? "Anyone can sign in from anywhere."
                : `Attendance only works within ${radius} m of ${officeLabel}.`}
            </p>
          </div>
          <span className={`pill ${testMode ? "wait" : "on"}`}>
            {testMode ? "test" : "live"}
          </span>
        </header>

        <div className="body stack">
          {error && <p className="note bad">{error}</p>}
          {done && !error && <p className="note good">{done}</p>}

          {testMode ? (
            <>
              <p className="note warn">
                While test mode is on, the location check is switched off and
                everyone sees a warning banner. Nothing recorded now should be
                trusted as real attendance.
              </p>

              <div className="stack-s">
                <h3>Walking someone through it</h3>
                <p className="small muted">
                  Seed the demo and you get two interns with three weeks of
                  attendance behind them, a work log, tasks, an override request
                  and a leave request waiting in the approvals queue. Enough to
                  show the whole thing in five minutes.
                </p>
              </div>

              <div className="row">
                <button
                  className="btn"
                  disabled={busy !== null}
                  onClick={() => run("seed")}
                >
                  {busy === "seed" ? "Building" : "Seed demo data"}
                </button>
                {demoRows > 0 && (
                  <button
                    className="btn ghost"
                    disabled={busy !== null}
                    onClick={() =>
                      run("wipe", "Remove all demo data? Real records are untouched.")
                    }
                  >
                    {busy === "wipe" ? "Removing" : `Remove demo data (${demoRows} rows)`}
                  </button>
                )}
              </div>

              {demoRows > 0 && (
                <div className="note plain">
                  <p style={{ marginBottom: 6 }}>
                    <b>Demo logins</b>, so you can show the intern side:
                  </p>
                  {demoEmails.map((email) => (
                    <p key={email} className="mono small">
                      {email}
                    </p>
                  ))}
                  <p className="mono small">password: {demoPassword}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="note good">
                The system is live. Attendance is only accepted inside the
                office fence, and the test banner is gone.
              </p>
              <div>
                <button
                  className="btn"
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      "test_on",
                      "Switch back to test mode? The office fence stops being enforced until you go live again."
                    )
                  }
                >
                  {busy === "test_on" ? "Switching" : "Back to test mode"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {testMode && (
        <section className="panel">
          <header>
            <h2>Going live</h2>
          </header>
          <div className="body stack">
            <p className="muted">
              This switches the office fence on and deletes every demo row in
              one go. Real accounts and real attendance are not touched.
            </p>

            <ol className="stack-s small muted" style={{ paddingInlineStart: 20, margin: 0 }}>
              <li>
                Set the office location from inside the building, on the
                Settings page.
              </li>
              <li>Check the working hours and placement dates are right.</li>
              <li>Approve the real interns and supervisors.</li>
              <li>Then press the button.</li>
            </ol>

            <div>
              <button
                className="btn solid"
                disabled={busy !== null}
                onClick={() =>
                  run(
                    "go_live",
                    "Go live? All demo data is deleted and the office fence starts being enforced."
                  )
                }
              >
                {busy === "go_live" ? "Going live" : "Go live"}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
