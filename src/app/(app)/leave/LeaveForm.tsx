"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { officeToday } from "@/lib/dates";

export function LeaveForm() {
  const router = useRouter();
  const today = officeToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to, reason }),
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Could not send that.");
      return;
    }
    setReason("");
    setSent(true);
    router.refresh();
  }

  return (
    <form className="panel" onSubmit={submit}>
      <header>
        <h2>Ask for a day off</h2>
      </header>
      <div className="body stack">
        {error && <p className="note bad">{error}</p>}
        {sent && !error && (
          <p className="note good">
            Sent. Your supervisor will see it on their dashboard.
          </p>
        )}

        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field grow">
            <label htmlFor="from">First day</label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                if (e.target.value > to) setTo(e.target.value);
              }}
              required
            />
          </div>
          <div className="field grow">
            <label htmlFor="to">Last day</label>
            <input
              id="to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="why">Why</label>
          <input
            id="why"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div>
          <button className="btn solid" disabled={busy}>
            {busy ? "Sending" : "Send request"}
          </button>
        </div>
      </div>
    </form>
  );
}
