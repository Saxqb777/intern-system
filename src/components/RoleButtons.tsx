"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The only place a role is ever handed out. Deliberately three separate
 * buttons rather than a dropdown, so nobody makes an admin by mis-scrolling.
 */
export function RoleButtons({
  id,
  canMakeOwner,
}: {
  id: number;
  canMakeOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function set(role: string) {
    if (role === "reject" && !confirm("Delete this signup? It cannot be undone.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, role }),
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
        <button className="btn tiny solid" disabled={busy} onClick={() => set("intern")}>
          Intern
        </button>
        <button className="btn tiny" disabled={busy} onClick={() => set("admin")}>
          Supervisor
        </button>
        {canMakeOwner && (
          <button className="btn tiny" disabled={busy} onClick={() => set("superuser")}>
            Owner
          </button>
        )}
        <button className="btn tiny danger" disabled={busy} onClick={() => set("reject")}>
          Delete
        </button>
      </div>
      {error && <span className="small" style={{ color: "var(--red)" }}>{error}</span>}
    </div>
  );
}
