"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  /** null when nothing has been drawn yet. */
  toDataUrl: () => string | null;
  clear: () => void;
};

/**
 * Finger or mouse.
 *
 * Two things matter here. It has to be visible while you are drawing, which
 * means ink that contrasts with the pad you are drawing on, not with the page
 * behind it. And it has to survive the trip into a Word document, which means
 * dark ink on white, since that page is white whatever theme the phone was in.
 *
 * So the pad is always a white card, in both themes, and the ink is always
 * near-black. What you see is what lands on the sheet.
 */
export function SignaturePad({
  ref,
  height = 168,
}: {
  ref: React.RefObject<SignaturePadHandle | null>;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // A canvas inside a closed <dialog> has a client width of zero, so sizing it
  // once on mount produces a zero-width pad. Watch instead, and size it the
  // moment it actually has a width.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function fit() {
      const el = canvasRef.current;
      if (!el) return;

      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(el.clientWidth * ratio);
      if (width === 0 || el.width === width) return;

      el.width = width;
      el.height = Math.round(height * ratio);
      style(el, ratio);
      setHasInk(false);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height]);

  function style(el: HTMLCanvasElement, ratio: number) {
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#16181A";
  }

  function pointAt(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = pointAt(event);

    // A tap with no drag should still leave a mark.
    const { x, y } = last.current;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#16181A";
    ctx.fill();
    setHasInk(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.preventDefault();

    const point = pointAt(event);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    last.current = point;
  }

  function stop() {
    drawing.current = false;
    last.current = null;
  }

  function wipe() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    style(canvas, window.devicePixelRatio || 1);
    setHasInk(false);
  }

  useImperativeHandle(
    ref,
    () => ({
      toDataUrl: () =>
        hasInk ? (canvasRef.current?.toDataURL("image/png") ?? null) : null,
      clear: wipe,
    }),
    [hasInk]
  );

  return (
    <div className="padwrap">
      <canvas
        ref={canvasRef}
        className="sigpad"
        style={{ height }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      />
      <div className="padfoot">
        <span className="baseline" aria-hidden="true" />
        <button type="button" className="btn ghost tiny" onClick={wipe}>
          Clear
        </button>
      </div>
    </div>
  );
}
