"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OwnerForm() {
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
        setupCode: data.get("setupCode"),
      }),
    });
    const body = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      setBusy(false);
      return;
    }

    router.replace("/super");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 22 }}>
      {error && <p className="note bad">{error}</p>}

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>

      <div className="field">
        <label htmlFor="email">Your email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
        />
        <p className="help">
          Any address. This one is not checked against Agthia domains.
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
        <label htmlFor="position">What to call your role</label>
        <input
          id="position"
          name="position"
        />
        <p className="help">Shown next to your name in the app.</p>
      </div>

      <div className="field">
        <label htmlFor="setupCode">Setup code</label>
        <input id="setupCode" name="setupCode" required autoComplete="off" />
        <p className="help">
          The <span className="mono">SETUP_CODE</span> you put into Vercel.
        </p>
      </div>

      <button className="btn solid wide" type="submit" disabled={busy}>
        {busy ? "Creating" : "Become an administrator"}
      </button>
    </form>
  );
}
