"use client";

/**
 * Last resort: the root layout itself failed, so there is no app shell and no
 * stylesheet to lean on. Everything here is inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F6F1",
          color: "#1D1D1B",
          fontFamily: "system-ui, sans-serif",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>
            The system did not start
          </h1>
          <p style={{ margin: "0 0 20px", color: "#5E5F55", lineHeight: 1.5 }}>
            Something failed before the page could load. Try again, and if it
            keeps happening the reference below will be in the server logs.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#566F07",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "11px 20px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 18, fontSize: 12, color: "#6E6F62" }}>
              Reference {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
