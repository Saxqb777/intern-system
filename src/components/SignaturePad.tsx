"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  /** null when nothing has been drawn yet. */
  toDataUrl: () => string | null;
  clear: () => void;
};

/**
 * Finger or mouse. Draws at device pixel ratio so a signature captured on a
 * phone is still crisp when it lands in the Word document.
 */
export function SignaturePad({
  ref,
  height = 150,
}: {
  ref: React.RefObject<SignaturePadHandle | null>;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
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

      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Dark ink on a transparent ground whatever theme the page is in,
      // because this image ends up on a white page in Word.
      ctx.strokeStyle = "#1D1D1B";
      setHasInk(false);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height]);

  function pointAt(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointAt(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointAt(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }

  function stop() {
    drawing.current = false;
  }

  useImperativeHandle(ref, () => ({
    toDataUrl: () => (hasInk ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasInk(false);
    },
  }), [hasInk]);

  return (
    <div className="stack-s">
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
      <div className="spread">
        <span className="small faint">
          {hasInk ? "Looks good." : "Sign with your finger."}
        </span>
        <button
          type="button"
          className="btn ghost tiny"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasInk(false);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
