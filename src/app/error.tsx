"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Anything that throws on the server lands here rather than on Vercel's blank
 * error page. The digest is what ties this screen to a line in the runtime
 * logs, so it is shown rather than hidden.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">Something broke</p>
          <h1>That page did not load</h1>
        </div>

        <p className="lede small">
          Nothing you did. The page hit an error on our side and stopped rather
          than show you something wrong.
        </p>

        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn solid" onClick={reset}>
            Try again
          </button>
          <Link className="btn" href="/">
            Start over
          </Link>
        </div>

        {error.digest && (
          <p className="note plain mono" style={{ marginTop: 18, fontSize: 12 }}>
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
