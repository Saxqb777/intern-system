"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { niceDate } from "@/lib/dates";

export function LogEditor({
  date,
  initial,
}: {
  date: string;
  initial: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState<"clean" | "saving" | "done">("clean");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save a second and a half after they stop typing. Nobody should have to
  // remember to press a button on a diary.
  useEffect(() => {
    if (text === initial) return;
    setSaved("saving");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, body: text }),
      });
      setSaved("done");
      router.refresh();
    }, 1500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, initial, date, router]);

  return (
    <section className="panel">
      <header>
        <div>
          <h2>Today</h2>
          <p className="mono faint small">{niceDate(date)}</p>
        </div>
        <span className="small faint">
          {saved === "saving" ? "Saving" : saved === "done" ? "Saved" : ""}
        </span>
      </header>

      <div className="body">
        <div className="field">
          <label htmlFor="entry">What you worked on</label>
          <textarea
            id="entry"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Sat in on the supplier call about the date packaging line. Pulled last quarter's volumes into a sheet for Khalid. Started reading the HACCP file."
            style={{ minHeight: 190 }}
          />
          <p className="help">Saves on its own.</p>
        </div>
      </div>
    </section>
  );
}
