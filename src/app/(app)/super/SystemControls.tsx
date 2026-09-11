"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SystemControls({
  testMode,
  simulateOutside,
  demoRows,
  officeLabel,
  radius,
  demoPassword,
  demoEmails,
}: {
  testMode: boolean;
  simulateOutside: boolean;
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

  async function run(
    action: string,
    extra: Record<string, unknown> = {},
    confirmText?: string
  ) {
    if (confirmText && !confirm(confirmText)) return;

    setBusy(action);
    setError(null);
    setDone(null);

    const res = await fetch("/api/super", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
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
      setDone(
        `Made ${body.people} demo interns and ${body.days} days of attendance.`
      );
    } else if (action === "go_live") {
      setDone("Live. The fence is on and the demo data is gone.");
    } else if (action === "wipe") {
      setDone("Demo data removed.");
    } else if (action === "simulate_outside") {
      setDone(
        extra.on
          ? "Interns will now be refused, as if they were 4.2 km away."
          : "Back to normal. Interns can sign in again."
      );
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
                ? "Nothing here is real attendance."
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
              <div className="row">
                <button
                  className="btn"
                  disabled={busy !== null}
                  onClick={() => run("seed")}
                >
                  {busy === "seed"
                    ? "Building"
                    : demoRows > 0
                      ? "Rebuild demo data"
                      : "Seed demo data"}
                </button>
                {demoRows > 0 && (
                  <button
                    className="btn ghost"
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        "wipe",
                        {},
                        "Remove all demo data? Real records are untouched."
                      )
                    }
                  >
                    {busy === "wipe" ? "Removing" : `Remove demo (${demoRows} rows)`}
                  </button>
                )}
              </div>

              {demoRows > 0 && (
                <div className="note plain">
                  <p style={{ marginBottom: 6 }}>
                    <b>Demo logins.</b> Open a private window and sign in as one
                    of these to show the intern side.
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
                office fence and the test banner is gone.
              </p>
              <div>
                <button
                  className="btn"
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      "test_on",
                      {},
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

      {/* ---------- the bit that makes a demo possible ---------- */}
      {testMode && (
        <section className="panel">
          <header>
            <div>
              <h2>Pretend everyone is out of range</h2>
              <p className="small faint">
                For showing the refusal without leaving the building.
              </p>
            </div>
            <span className={`pill ${simulateOutside ? "stop" : "off"}`}>
              {simulateOutside ? "refusing" : "off"}
            </span>
          </header>
          <div className="body stack">
            <p className="muted">
              The whole point of this system is that it says no when somebody is
              not at Al Foah. Test mode switches the fence off, which makes that
              impossible to demonstrate from a desk. Turn this on and every
              intern is told they are 4.2 km away, so you can show the refusal
              and the override request that follows it.
            </p>

            <div>
              <button
                className={simulateOutside ? "btn solid" : "btn warn"}
                disabled={busy !== null}
                onClick={() =>
                  run("simulate_outside", { on: !simulateOutside })
                }
              >
                {busy === "simulate_outside"
                  ? "Switching"
                  : simulateOutside
                    ? "Let them sign in again"
                    : "Start refusing everyone"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ---------- a script to present from ---------- */}
      {testMode && demoRows > 0 && (
        <section className="panel">
          <header>
            <h2>Showing it to someone</h2>
            <span className="small faint">about five minutes</span>
          </header>
          <div className="body">
            <ol className="stack" style={{ paddingInlineStart: 22, margin: 0 }}>
              <Step n="Start on the dashboard" href="/admin">
                Two interns, one on site with hours ticking up, one not in yet.
                Underneath, the queue of things waiting on a decision.
              </Step>
              <Step n="Approve the override request" href="/admin">
                An intern stuck outside the fence asked to be let in. Approve
                it and watch it land on their sheet, marked as an override so
                nobody can pretend it was a normal punch.
              </Step>
              <Step n="Open the attendance sheet" href="/admin/sheet">
                Every working day, the real times, approved leave written in
                rather than left blank. Edit a day and it gets stamped as edited.
              </Step>
              <Step n="Download the Word file" href="/admin/sheet">
                This is the part that matters. Put it next to the paper form the
                university sent. Same title, same columns, filled in.
              </Step>
              <Step n="Then the intern side">
                Private window, sign in as one of the demo accounts above. Press
                the dial to sign in. Press it again and it asks for a signature.
              </Step>
              <Step n="Finally, the refusal">
                Come back here, press <b>Start refusing everyone</b>, and reload
                the intern window. The dial goes dead and they are offered an
                override request instead. That is the whole idea of the system in
                one screen.
              </Step>
            </ol>
          </div>
        </section>
      )}

      {testMode && (
        <section className="panel">
          <header>
            <h2>Going live</h2>
          </header>
          <div className="body stack">
            <p className="muted">
              Switches the office fence on and deletes every demo row in one go.
              Real accounts and real attendance are not touched.
            </p>

            <ol
              className="stack-s small muted"
              style={{ paddingInlineStart: 20, margin: 0 }}
            >
              <li>
                Stand inside the building and set the office location on the{" "}
                <Link href="/admin/settings">Settings page</Link>.
              </li>
              <li>Check the working hours and placement dates are right.</li>
              <li>
                Approve the real interns and supervisors on{" "}
                <Link href="/admin/approvals">Approvals</Link>.
              </li>
              <li>Then press the button.</li>
            </ol>

            <div>
              <button
                className="btn solid"
                disabled={busy !== null}
                onClick={() =>
                  run(
                    "go_live",
                    {},
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

function Step({
  n,
  href,
  children,
}: {
  n: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <b>{href ? <Link href={href}>{n}</Link> : n}</b>
      <p className="small muted">{children}</p>
    </li>
  );
}
