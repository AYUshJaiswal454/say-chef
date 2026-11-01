/** Line icons drawn on a 24px grid. "c:" is a circle, "r:" a rect, "f:" a filled path. */
const ICONS = {
  search: ['c:11,11,7', 'M20 20l-3.6-3.6'],
  mic: ['r:9,3,6,11,3', 'M5 10v1a7 7 0 0 0 14 0v-1', 'M12 18v3'],
  micOff: [
    'M3 3l18 18',
    'M9 9v2a3 3 0 0 0 5.1 2.1',
    'M15 9.3V6a3 3 0 0 0-5.9-.7',
    'M19 10v1a7 7 0 0 1-1.1 3.8',
    'M5 10v1a7 7 0 0 0 11.2 5.6',
    'M12 18v3',
  ],
  volume: ['M11 5 6 9H3v6h3l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
  timer: ['c:12,13,8', 'M12 9v4l2.5 2', 'M9.5 2h5'],
  heart: [
    'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z',
  ],
  heartFill: [
    'f:M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  trash: ['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M9 6V4h6v2'],
  clock: ['c:12,12,9', 'M12 7v5l3 2'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'c:9,7,4', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7'],
  arrowRight: ['M5 12h14', 'M12 5l7 7-7 7'],
  play: ['f:M7 4.5v15l12-7.5z'],
  pause: ['f:M6 4.5h4v15H6zM14 4.5h4v15h-4z'],
  skipBack: ['f:M19 5v14l-10-7z', 'M5 5v14'],
  check: ['M20 6 9 17l-5-5'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  list: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  sun: ['c:12,12,4', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  monitor: ['r:2,3,20,14,2', 'M8 21h8', 'M12 17v4'],
  basket: ['M4 10h16l-1.6 9.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8z', 'M8 10l4-6 4 6'],
  info: ['c:12,12,9', 'M12 16v-4', 'M12 8h.01'],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  github: [
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  ],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map((part, i) => {
        if (part.startsWith('c:')) {
          const [cx, cy, r] = part.slice(2).split(',');
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (part.startsWith('r:')) {
          const [x, y, w, h, rx] = part.slice(2).split(',');
          return <rect key={i} x={x} y={y} width={w} height={h} rx={rx ?? 0} />;
        }
        if (part.startsWith('f:')) return <path key={i} d={part.slice(2)} fill="currentColor" stroke="none" />;
        return <path key={i} d={part} />;
      })}
    </svg>
  );
}
