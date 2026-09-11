import Link from "next/link";

export default function NotFound() {
  return (
    <div className="authpage">
      <div className="brandline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agthia-logo.png" alt="Agthia" width={116} height={77} />
      </div>

      <div className="authcard">
        <div className="authhead">
          <p className="eyebrow">404</p>
          <h1>Nothing here</h1>
        </div>

        <p className="lede small">
          That address does not exist. It may have been a link from an older
          version of the system.
        </p>

        <div style={{ marginTop: 20 }}>
          <Link className="btn solid" href="/">
            Go to your page
          </Link>
        </div>
      </div>
    </div>
  );
}
