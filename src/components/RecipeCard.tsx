import { defaultPlate } from '../data/cuisines';
import { averageRating, totalMinutes, type Recipe } from '../lib/data';
import { formatMinutes, parseDurations } from '../lib/recipe/durations';
import type { PantryMatch } from '../lib/recipe/matching';
import { Link } from '../lib/router';
import { Icon } from './Icon';
import { PlateArt } from './PlateArt';
import { Stars } from './Stars';

interface RecipeCardProps {
  recipe: Recipe;
  saved: boolean;
  onToggleSave: () => void;
  pantry?: PantryMatch;
}

export function RecipeCard({ recipe: r, saved, onToggleSave, pantry }: RecipeCardProps) {
  const timers = r.steps.filter(s => parseDurations(s).length > 0).length;
  const avg = averageRating(r);
  // Vegan implies vegetarian, so don't spend a badge on both.
  const badges = r.diet.filter(d => d !== 'Vegetarian' || !r.diet.includes('Vegan')).slice(0, 2);
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={`/recipes/${r.id}`} tabIndex={-1} aria-hidden="true" className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-sunken">
          <PlateArt
            seed={r.id}
            plate={r.plate || defaultPlate(r.cuisine)}
            className="h-full w-full transition duration-500 group-hover:scale-[1.035]"
          />
        </div>
      </Link>
      {r.starter && (
        <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-ink uppercase shadow-card">
          Starter
        </span>
      )}
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${r.title} from saved` : `Save ${r.title}`}
        className={`absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-surface shadow-card transition hover:scale-105 ${saved ? 'text-tomato' : 'text-ink'}`}
      >
        <Icon name={saved ? 'heartFill' : 'heart'} size={18} />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3.5">
        <div className="label">
          {r.cuisine} · {r.difficulty}
        </div>
        <h3 className="font-display text-[21px] leading-[1.15] text-ink">
          <Link to={`/recipes/${r.id}`} className="decoration-2 underline-offset-4 hover:underline">
            {r.title}
          </Link>
        </h3>
        <div className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={15} />
            {formatMinutes(totalMinutes(r))}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="users" size={15} />
            {r.servings}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="timer" size={15} />
            {timers} timer{timers === 1 ? '' : 's'}
          </span>
        </div>
        {pantry && (
          <div className="tabular w-fit rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[12px] text-ink">
            {pantry.have} of {pantry.total} in your kitchen
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="tabular inline-flex items-center gap-1.5 text-[13.5px] text-muted">
            <Stars value={avg} size={14} />
            {r.ratingCount ? (
              <>
                <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
                <span>({r.ratingCount})</span>
              </>
            ) : (
              <span>New</span>
            )}
          </span>
          <span className="flex min-w-0 gap-1 overflow-hidden">
            {badges.map(d => (
              <span key={d} className="truncate rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] font-semibold text-muted">
                {d}
              </span>
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface" aria-hidden="true">
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
