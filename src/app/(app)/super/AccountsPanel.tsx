"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dayOf, niceDate } from "@/lib/dates";

export type Person = {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string | null;
  department: string | null;
  university: string | null;
  created_at: string;
};

const ROLE_NAME: Record<string, string> = {
  superuser: "Administrator",
  admin: "Supervisor",
  intern: "Intern",
  pending: "Awaiting approval",
};

export function AccountsPanel({
  people,
  meId,
  officePlaced,
}: {
  people: Person[];
  meId: number;
  officePlaced: boolean;
  today: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function remove(person: Person) {
    const typed = prompt(
      `Deleting ${person.name} also deletes their attendance, work log, tasks and requests. This cannot be undone.\n\nType their name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== person.name) {
      setError("That name did not match, so nothing was deleted.");
      return;
    }

    setBusy(person.id);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id: person.id }),
    });
    setBusy(null);

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not delete that account.");
      return;
    }
    router.refresh();
  }

  const byRole = (role: string) => people.filter((p) => p.role === role);

  return (
    <div className="stack-l">
      {error && <p className="note bad">{error}</p>}

      {!officePlaced && (
        <div className="note warn">
          <b style={{ display: "block", marginBottom: 4 }}>
            Attendance is closed until the office is placed
          </b>
          Accounts work, but nobody can sign in or out until the fence has a
          position. <Link href="/admin/settings">Set it in Settings</Link>,
          standing where you want the fence centred.
        </div>
      )}

      <div>
        <button className="btn solid" onClick={() => dialog.current?.showModal()}>
          New account
        </button>
      </div>

      <Group
        title="Supervisors"
        blurb="They approve requests, correct the record and pull the sheet."
        people={byRole("admin")}
        meId={meId}
        busy={busy}
        onRemove={remove}
      />
      <Group
        title="Interns"
        blurb="They sign in and out, and everything on the sheet comes from them."
        people={byRole("intern")}
        meId={meId}
        busy={busy}
        onRemove={remove}
      />
      {byRole("pending").length > 0 && (
        <Group
          title="Signed up, no role yet"
          blurb="They created their own account. Give them a role on the People page."
          people={byRole("pending")}
          meId={meId}
          busy={busy}
          onRemove={remove}
        />
      )}
      <Group
        title="Administrators"
        blurb="Full access, including this page."
        people={byRole("superuser")}
        meId={meId}
        busy={busy}
        onRemove={remove}
      />

      <NewAccountDialog ref={dialog} onDone={() => router.refresh()} />
    </div>
  );
}

function Group({
  title,
  blurb,
  people,
  meId,
  busy,
  onRemove,
}: {
  title: string;
  blurb: string;
  people: Person[];
  meId: number;
  busy: number | null;
  onRemove: (p: Person) => void;
}) {
  return (
    <section className="panel">
      <header>
        <div>
          <h2>{title}</h2>
          <p className="small faint">{blurb}</p>
        </div>
        <span className="count">{people.length}</span>
      </header>

      {people.length === 0 ? (
        <p className="empty">Nobody here yet.</p>
      ) : (
        <div className="divide">
          {people.map((person) => (
            <div key={person.id} className="row" style={{ padding: "15px 20px" }}>
              <span className="initials" aria-hidden="true">
                {initialsOf(person.name)}
              </span>
              <div className="grow">
                <b>{person.name}</b>
                {person.id === meId && (
                  <span className="small faint"> &middot; you</span>
                )}
                <p className="small faint mono">{person.email}</p>
                <p className="small muted">
                  {[person.position, person.department, person.university]
                    .filter(Boolean)
                    .join(" · ") || ROLE_NAME[person.role]}
                </p>
              </div>
              <span className="small faint mono" style={{ whiteSpace: "nowrap" }}>
                since {niceDate(dayOf(person.created_at))}
              </span>
              {person.id !== meId && (
                <button
                  className="btn tiny danger"
                  disabled={busy !== null}
                  onClick={() => onRemove(person)}
                >
                  {busy === person.id ? "Deleting" : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NewAccountDialog({
  ref,
  onDone,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("intern");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        role,
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        position: data.get("position"),
        department: data.get("department"),
        university: data.get("university"),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Could not create the account.");
      return;
    }
    (event.target as HTMLFormElement).reset();
    ref.current?.close();
    onDone();
  }

  return (
    <dialog className="sheet" ref={ref}>
      <form className="inner" onSubmit={submit}>
        <div>
          <p className="eyebrow">New account</p>
          <h2>Add someone</h2>
        </div>

        {error && <p className="note bad">{error}</p>}

        <div className="choice">
          {[
            { value: "intern", label: "Intern", note: "Signs in and out" },
            { value: "admin", label: "Supervisor", note: "Approves and reports" },
          ].map((option) => (
            <label
              key={option.value}
              className={role === option.value ? "on" : undefined}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
              />
              <b>{option.label}</b>
              <span>{option.note}</span>
            </label>
          ))}
        </div>

        <div className="field">
          <label htmlFor="acc-name">Full name</label>
          <input id="acc-name" name="name" required autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="acc-email">Email</label>
          <input
            id="acc-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            inputMode="email"
          />
        </div>

        <div className="field">
          <label htmlFor="acc-pass">Password to give them</label>
          <input
            id="acc-pass"
            name="password"
            required
            minLength={8}
            autoComplete="off"
          />
          <p className="help">
            They can keep it or change it later. Eight characters or more.
          </p>
        </div>

        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="field grow">
            <label htmlFor="acc-pos">Position</label>
            <input id="acc-pos" name="position" autoComplete="off" />
          </div>
          <div className="field grow">
            <label htmlFor="acc-dept">Department</label>
            <input id="acc-dept" name="department" autoComplete="off" />
          </div>
        </div>

        {role === "intern" && (
          <div className="field">
            <label htmlFor="acc-uni">University</label>
            <input id="acc-uni" name="university" autoComplete="off" />
          </div>
        )}

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => ref.current?.close()}
          >
            Cancel
          </button>
          <button className="btn solid" disabled={busy}>
            {busy ? "Creating" : "Create account"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** MB from "Maryam Al Blooshi". First and last, never the middle. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
