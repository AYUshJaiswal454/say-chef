import { useId, useState } from 'react';

const STAR_POINTS = '12 2.5 15 8.6 21.7 9.6 16.8 14.3 18 21 12 17.8 6 21 7.2 14.3 2.3 9.6 9 8.6';

function StarGlyph({ size, fill }: { size: number; fill: 0 | 0.5 | 1 }) {
  const clipId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {fill === 0.5 && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      <polygon points={STAR_POINTS} fill="var(--line)" />
      {fill > 0 && (
        <polygon points={STAR_POINTS} fill="var(--star)" clipPath={fill === 0.5 ? `url(#${clipId})` : undefined} />
      )}
    </svg>
  );
}

/** Read-only stars, rounded to the nearest half. */
export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span
      className="inline-flex items-center gap-px"
      role="img"
      aria-label={value ? `${value.toFixed(1)} out of 5 stars` : 'Not rated yet'}
    >
      {[1, 2, 3, 4, 5].map(i => (
        <StarGlyph key={i} size={size} fill={v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0} />
      ))}
    </span>
  );
}

const RATING_WORDS = ['', 'Not for me', 'It was okay', 'Good', 'Really good', 'Make it again'];

export function StarInput({ value, onChange, size = 30 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            className="rounded-md p-0.5 transition-transform hover:scale-110"
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
          >
            <StarGlyph size={size} fill={shown >= i ? 1 : 0} />
          </button>
        ))}
      </div>
      <span className="min-w-[7rem] text-[14px] font-medium text-muted">{RATING_WORDS[shown] || 'Tap to rate'}</span>
    </div>
  );
}
