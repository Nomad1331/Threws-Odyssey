/**
 * VoiceBridge logo mark.
 *
 * Two abstract figures — circular heads and mirrored, leaning silhouettes —
 * meet at a single point to form a heart. The gap between them is intentional
 * negative space: it reads as an embrace rather than a sliced heart.
 *
 * The mark uses currentColor so it can sit on light or dark surfaces without a
 * second asset. The same geometry is used by public/logo.svg and app/icon.svg.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="21.5" cy="8.2" r="3.4" />
      <circle cx="42.5" cy="8.2" r="3.4" />
      <path d="M32 58C22.5 51.5 8.5 43 8.5 31C8.5 21 14.5 14 21.5 14C26.5 14 29 17 29.5 21C28.2 33 28.8 45 32 58Z" />
      <path d="M32 58C41.5 51.5 55.5 43 55.5 31C55.5 21 49.5 14 42.5 14C38 14 35 17 34.5 21C35.8 33 35.2 45 32 58Z" />
    </svg>
  );
}
