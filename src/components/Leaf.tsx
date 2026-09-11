/** The leaf from the Agthia mark, redrawn as a path so it scales and recolours. */
export function Leaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" aria-hidden="true">
      <path
        d="M32 5C46.5 21 50.5 45 32 67C13.5 45 17.5 21 32 5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M32 13V63M32 27L20.5 34.5M32 27L43.5 34.5M32 41L21.5 48M32 41L42.5 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Leaf inside the green disc, the way it sits in the logo. */
export function LeafBadge({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle cx="36" cy="36" r="36" fill="var(--green)" />
      <g transform="translate(14 11) scale(0.69)" color="#fff">
        <path
          d="M32 5C46.5 21 50.5 45 32 67C13.5 45 17.5 21 32 5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.6"
          strokeLinejoin="round"
        />
        <path
          d="M32 13V63M32 27L20.5 34.5M32 27L43.5 34.5M32 41L21.5 48M32 41L42.5 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
