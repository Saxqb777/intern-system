"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dayOf, niceDate, officeToday } from "@/lib/dates";

export type TaskItem = {
  id: number;
  title: string;
  detail: string | null;
  done: boolean;
  due_date: string | null;
  from_name: string | null;
};

export function TaskList({
  tasks,
  canAdd,
  forUserId,
  ownerName,
}: {
  tasks: TaskItem[];
  canAdd?: boolean;
  forUserId?: number;
  ownerName?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "That did not work.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const ok = await call({
      action: "add",
      title,
      due: due || null,
      userId: forUserId,
    });
    setBusy(false);
    if (ok) {
      setTitle("");
      setDue("");
    }
  }

  const today = officeToday();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="stack-l">
      {error && <p className="note bad">{error}</p>}

      {canAdd && (
        <form className="panel" onSubmit={add}>
          <div className="body">
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div className="field grow">
                <label htmlFor="tasktitle">
                  {forUserId ? `New task for ${ownerName}` : "Add a task"}
                </label>
                <input
                  id="tasktitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                 
                />
              </div>
              <div className="field" style={{ width: 160 }}>
                <label htmlFor="taskdue">Due</label>
                <input
                  id="taskdue"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
              <button className="btn solid" disabled={busy || !title.trim()}>
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="panel">
        <header>
          <h2>To do</h2>
          <span className="small faint">{open.length}</span>
        </header>
        {open.length === 0 ? (
          <p className="empty">
            Nothing to do yet. Add something above, or wait for your supervisor
            to.
          </p>
        ) : (
          <div className="divide">
            {open.map((task) => (
              <Row
                key={task.id}
                task={task}
                today={today}
                onToggle={() => call({ action: "toggle", id: task.id, done: true })}
                onDelete={() => call({ action: "delete", id: task.id })}
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="panel">
          <header>
            <h2>Done</h2>
            <span className="small faint">{done.length}</span>
          </header>
          <div className="divide">
            {done.map((task) => (
              <Row
                key={task.id}
                task={task}
                today={today}
                onToggle={() => call({ action: "toggle", id: task.id, done: false })}
                onDelete={() => call({ action: "delete", id: task.id })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  task,
  today,
  onToggle,
  onDelete,
}: {
  task: TaskItem;
  today: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = task.due_date ? dayOf(task.due_date) : null;
  const late = !task.done && due !== null && due < today;

  return (
    <div className="row" style={{ padding: "13px 20px", flexWrap: "nowrap" }}>
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={task.done}
        onChange={onToggle}
        style={{ width: 17, height: 17, flex: "0 0 auto", accentColor: "var(--green)" }}
      />
      <label htmlFor={`task-${task.id}`} className="grow" style={{ cursor: "pointer" }}>
        <span
          style={{
            textDecoration: task.done ? "line-through" : "none",
            color: task.done ? "var(--ink-faint)" : "inherit",
          }}
        >
          {task.title}
        </span>
        <span className="small faint" style={{ display: "block" }}>
          {due && (
            <span className={late ? "" : "faint"} style={late ? { color: "var(--amber-ink)", fontWeight: 600 } : undefined}>
              {late ? "Overdue " : "Due "}
              {niceDate(due)}
            </span>
          )}
          {due && task.from_name && " · "}
          {task.from_name && `from ${task.from_name}`}
        </span>
      </label>
      <button className="btn ghost tiny" onClick={onDelete} aria-label={`Delete ${task.title}`}>
        Remove
      </button>
    </div>
  );
}
