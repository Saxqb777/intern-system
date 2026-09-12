"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }),
    });
    const body = (await res.json()) as { error?: string; role?: string };

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      setBusy(false);
      return;
    }

    router.replace("/pending");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="note bad">{error}</p>}

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" required autoComplete="name" />
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
        <p className="help">8 characters or more.</p>
      </div>

      <div className="field">
        <label htmlFor="position">Internal position</label>
        <input
          id="position"
          name="position"
        />
      </div>

      <div className="field">
        <label htmlFor="department">Department</label>
        <input id="department" name="department" />
      </div>

      <div className="field">
        <label htmlFor="university">University</label>
        <input id="university" name="university" />
      </div>

      <button className="btn solid wide" type="submit" disabled={busy}>
        {busy ? "Creating" : "Create account"}
      </button>
    </form>
  );
}
