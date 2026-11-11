/**
 * VoiceBridge logo mark.
 *
 * Two heads — patient and caregiver — lean toward each other while the outer
 * silhouette forms a heart. The inner heart is a true transparent cutout
 * (evenodd), so the mark works on light and dark surfaces without a dark fill.
 *
 * Geometry is shared with public/logo.svg and app/icon.svg. `currentColor`
 * keeps the mark black/white (or themed) rather than hard-coding a gradient.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="10" r="3.5" />
      <circle cx="28" cy="10" r="3.5" />
      <path
        fillRule="evenodd"
        d="M20 35C20 35 6 25 6 16.5C6 11.8 9.5 8.5 14 8.5C16.8 8.5 19.2 9.8 20 12C20.8 9.8 23.2 8.5 26 8.5C30.5 8.5 34 11.8 34 16.5C34 25 20 35 20 35Z M20 28.5C20 28.5 11 21 11 15C11 12 13 10.5 15.5 10.5C17.2 10.5 18.8 11.5 20 13C21.2 11.5 22.8 10.5 24.5 10.5C27 10.5 29 12 29 15C29 21 20 28.5 20 28.5Z"
      />
    </svg>
  );
}
