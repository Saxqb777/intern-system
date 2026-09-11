"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    const body = (await res.json()) as { error?: string; role?: string };

    if (!res.ok) {
      setError(body.error ?? "Could not sign you in.");
      setBusy(false);
      return;
    }

    const role = body.role;
    router.replace(
      role === "intern" ? "/today" : role === "pending" ? "/pending" : "/admin"
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="note bad">{error}</p>}

      <div className="field">
        <label htmlFor="email">Agthia email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          placeholder="you@agthia.com"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className="btn solid wide" type="submit" disabled={busy}>
        {busy ? "Checking" : "Sign in"}
      </button>
    </form>
  );
}
