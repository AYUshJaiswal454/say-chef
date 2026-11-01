/** A speckled enamel pot with sound waves rising from it. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--saffron)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M14.3 9.6a3.6 3.6 0 0 1 5.4 0" />
        <path d="M11.9 6.9a7 7 0 0 1 10.2 0" />
        <path d="M9.5 4.2a10.4 10.4 0 0 1 15 0" opacity=".55" />
      </g>
      <rect x="2" y="15.5" width="5" height="3" rx="1.5" fill="var(--ink)" />
      <rect x="27" y="15.5" width="5" height="3" rx="1.5" fill="var(--ink)" />
      <rect x="5.5" y="13" width="23" height="17" rx="5" fill="var(--enamel)" />
      <rect x="4.5" y="12" width="25" height="3.6" rx="1.8" fill="var(--ink)" />
      <g fill="#fff">
        <circle cx="11" cy="21" r=".9" opacity=".8" />
        <circle cx="20" cy="25" r=".7" opacity=".7" />
        <circle cx="24" cy="19.5" r=".8" opacity=".75" />
        <circle cx="15" cy="26.5" r=".6" opacity=".6" />
      </g>
    </svg>
  );
}
