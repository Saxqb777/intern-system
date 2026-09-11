"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm({
  domains,
  needsOwner,
}: {
  domains: string[];
  needsOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCode, setUseCode] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        position: data.get("position"),
        department: data.get("department"),
        university: data.get("university"),
        setupCode: useCode ? data.get("setupCode") : "",
      }),
    });
    const body = (await res.json()) as { error?: string; role?: string };

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      setBusy(false);
      return;
    }

    router.replace(body.role === "superuser" ? "/super" : "/pending");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="note bad">{error}</p>}

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" required autoComplete="name" />
        <p className="help">This is the name printed on the university sheet.</p>
      </div>

      <div className="field">
        <label htmlFor="email">Agthia email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          placeholder={`you@${domains[0]}`}
        />
        <p className="help">
          {domains.length === 1
            ? `Only ${domains[0]} addresses.`
            : `Accepted: ${domains.join(", ")}.`}
        </p>
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="help">At least 8 characters.</p>
      </div>

      <div className="field">
        <label htmlFor="position">Internal position</label>
        <input
          id="position"
          name="position"
          placeholder="Marketing intern"
        />
      </div>

      <div className="field">
        <label htmlFor="department">Department</label>
        <input id="department" name="department" placeholder="Marketing" />
      </div>

      <div className="field">
        <label htmlFor="university">University</label>
        <input id="university" name="university" placeholder="UAEU" />
        <p className="help">
          Leave blank if you are a supervisor and not an intern.
        </p>
      </div>

      {needsOwner && (
        <>
          <label className="row small" style={{ gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useCode}
              onChange={(e) => setUseCode(e.target.checked)}
              style={{ width: "auto" }}
            />
            <span>I am setting this system up and have the setup code</span>
          </label>

          {useCode && (
            <div className="field">
              <label htmlFor="setupCode">Setup code</label>
              <input id="setupCode" name="setupCode" required={useCode} />
              <p className="help">
                This makes you the system owner. It only works once, while
                nobody owns the system yet.
              </p>
            </div>
          )}
        </>
      )}

      <button className="btn solid wide" type="submit" disabled={busy}>
        {busy ? "Creating" : "Create account"}
      </button>
    </form>
  );
}
