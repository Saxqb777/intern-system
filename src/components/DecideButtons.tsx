"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecideButtons({
  kind,
  id,
}: {
  kind: "override" | "leave";
  id: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id, approve }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "That did not work.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="stack-s" style={{ alignItems: "flex-end" }}>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <button className="btn tiny solid" disabled={busy} onClick={() => decide(true)}>
          Approve
        </button>
        <button className="btn tiny" disabled={busy} onClick={() => decide(false)}>
          Reject
        </button>
      </div>
      {error && <span className="small" style={{ color: "var(--red)" }}>{error}</span>}
    </div>
  );
}
