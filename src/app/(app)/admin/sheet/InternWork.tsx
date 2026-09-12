"use client";

import { useState } from "react";
import { TaskList, type TaskItem } from "@/components/TaskList";
import { dayOf, dayShort, niceDate } from "@/lib/dates";

export type WorkLogEntry = {
  work_date: string;
  body: string;
  updated_at: string;
};

/**
 * The intern's own work, from the supervisor's side.
 *
 * The log and the task list existed only on the intern's screen, which meant
 * the person signing the sheet could not read what the intern said they did,
 * and could not give them anything to do. Both are collapsed by default: on
 * this page the attendance record is the job, and these are the context.
 */
export function InternWork({
  internId,
  internName,
  logs,
  tasks,
}: {
  internId: number;
  internName: string;
  logs: WorkLogEntry[];
  tasks: TaskItem[];
}) {
  const [open, setOpen] = useState<"none" | "log" | "tasks">("none");
  const outstanding = tasks.filter((t) => !t.done).length;

  return (
    <div className="stack">
      <div className="row">
        <Toggle
          on={open === "log"}
          onClick={() => setOpen(open === "log" ? "none" : "log")}
          label="Work log"
          count={logs.length ? `${logs.length} entries` : "nothing written"}
        />
        <Toggle
          on={open === "tasks"}
          onClick={() => setOpen(open === "tasks" ? "none" : "tasks")}
          label="Tasks"
          count={
            tasks.length === 0
              ? "none"
              : outstanding === 0
                ? "all done"
                : `${outstanding} outstanding`
          }
        />
      </div>

      {open === "log" && (
        <section className="panel">
          <header>
            <div>
              <h2>Work log</h2>
              <p className="small faint">
                Written by {internName}. You cannot edit it, which is the point.
              </p>
            </div>
          </header>
          {logs.length === 0 ? (
            <p className="empty">Nothing written for this period.</p>
          ) : (
            <div className="divide">
              {logs.map((entry) => (
                <article key={entry.work_date} style={{ padding: "16px 20px" }}>
                  <p className="eyebrow" style={{ marginBottom: 5 }}>
                    {dayShort(dayOf(entry.work_date))}{" "}
                    {niceDate(dayOf(entry.work_date))}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{entry.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {open === "tasks" && (
        <TaskList
          tasks={tasks}
          canAdd
          forUserId={internId}
          ownerName={internName}
        />
      )}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
  count,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  count: string;
}) {
  return (
    <button className={on ? "disclose on" : "disclose"} onClick={onClick} aria-expanded={on}>
      <b>{label}</b>
      <span>{count}</span>
    </button>
  );
}
