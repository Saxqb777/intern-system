"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ label = "Sign out of this account" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn ghost tiny"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
