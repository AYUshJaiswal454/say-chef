import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { PlateArt } from '../components/PlateArt';
import { RecipeCard, SkeletonCard } from '../components/RecipeCard';
import { CUISINES, DIETS, DIFFICULTIES } from '../data/cuisines';
import { STARTER_RECIPES } from '../data/starterRecipes';
import { averageRating, totalMinutes, type Recipe } from '../lib/data';
import { describeError } from '../lib/errors';
import { pantryMatch, parsePantry, type PantryMatch } from '../lib/recipe/matching';
import { Link } from '../lib/router';
import { useApp } from '../state/app';
import { useToast } from '../state/toasts';

export interface BrowseFilters {
  tab: 'all' | 'mine' | 'saved';
  cuisine: string;
  diet: string;
  time: string;
  level: string;
  sort: 'top' | 'quick' | 'new' | 'reviews' | 'az';
}

export const DEFAULT_FILTERS: BrowseFilters = {
  tab: 'all',
  cuisine: 'All',
  diet: 'Any',
  time: 'any',
  level: 'Any',
  sort: 'top',
};

const TIMES: Array<[string, string]> = [
  ['any', 'Any time'],
  ['20', '20 min or less'],
  ['30', '30 min or less'],
  ['45', '45 min or less'],
  ['60', '1 hour or less'],
];

const SORTS: Array<[BrowseFilters['sort'], string]> = [
  ['top', 'Top rated'],
  ['quick', 'Quickest'],
  ['new', 'Newest'],
  ['reviews', 'Most reviewed'],
  ['az', 'A to Z'],
];

/** Ranks by average, damped for recipes with only one or two ratings. */
function score(r: Recipe): number {
  return averageRating(r) * Math.min(1, r.ratingCount / 3);
}

interface BrowsePageProps {
  query: string;
  pantry: boolean;
  filters: BrowseFilters;
  setFilters: (update: (f: BrowseFilters) => BrowseFilters) => void;
  onClearQuery: () => void;
}

export function BrowsePage({ query, pantry, filters, setFilters, onClearQuery }: BrowsePageProps) {
  const { recipes, recipesStatus, recipesError, favorites, toggleFavorite, user, mode, source, signIn } = useApp();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);
  const set = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => setFilters(f => ({ ...f, [key]: value }));

  const cuisinesPresent = useMemo(
    () => CUISINES.map(c => c.name).filter(name => recipes.some(r => r.cuisine === name)),
    [recipes],
  );

  const { list, pantryInfo } = useMemo(() => {
    let out = recipes;
    if (filters.tab === 'mine') out = out.filter(r => r.authorId === user?.uid);
    if (filters.tab === 'saved') out = out.filter(r => favorites.has(r.id));
    if (filters.cuisine !== 'All') out = out.filter(r => r.cuisine === filters.cuisine);
    if (filters.diet !== 'Any') out = out.filter(r => (r.diet as string[]).includes(filters.diet));
    if (filters.time !== 'any') out = out.filter(r => totalMinutes(r) <= Number(filters.time));
    if (filters.level !== 'Any') out = out.filter(r => r.difficulty === filters.level);

    const info = new Map<string, PantryMatch>();
    const q = query.trim().toLowerCase();
    if (q && pantry) {
      const items = parsePantry(q);
      out = out.filter(r => {
        const m = pantryMatch(r.ingredients, items);
        if (!m.matched) return false;
        info.set(r.id, m);
        return true;
      });
    } else if (q) {
      const terms = q.split(/\s+/);
      out = out.filter(r => {
        const hay = [r.title, r.description, r.cuisine, r.difficulty, r.diet.join(' '), r.ingredients.join(' ')]
          .join(' ')
          .toLowerCase();
        return terms.every(t => hay.includes(t));
      });
    }

    const sorted = out.slice().sort((a, b) => {
      if (info.size) {
        const pa = info.get(a.id) as PantryMatch;
        const pb = info.get(b.id) as PantryMatch;
        if (pb.matched !== pa.matched) return pb.matched - pa.matched;
        return pb.have / pb.total - pa.have / pa.total;
      }
      switch (filters.sort) {
        case 'quick':
          return totalMinutes(a) - totalMinutes(b);
        case 'new':
          return b.createdAt - a.createdAt;
        case 'reviews':
          return b.ratingCount - a.ratingCount;
        case 'az':
          return a.title.localeCompare(b.title);
        default:
          return score(b) - score(a) || b.ratingCount - a.ratingCount || b.createdAt - a.createdAt;
      }
    });
    return { list: sorted, pantryInfo: info };
  }, [recipes, filters, query, pantry, favorites, user]);

  const filtered =
    !!query || filters.cuisine !== 'All' || filters.diet !== 'Any' || filters.time !== 'any' || filters.level !== 'Any';
  const clear = () => {
    onClearQuery();
    setFilters(f => ({ ...DEFAULT_FILTERS, tab: f.tab, sort: f.sort }));
  };
  const mineCount = user ? recipes.filter(r => r.authorId === user.uid).length : 0;
  const loading = recipesStatus === 'loading';

  const addStarters = async () => {
    if (!source || !user) return;
    setSeeding(true);
    try {
      await source.createRecipes(user, STARTER_RECIPES.map(({ id: _id, ...input }) => input), { starter: true });
      toast(`Added ${STARTER_RECIPES.length} starter recipes.`);
    } catch (e) {
      toast(describeError(e, 'add the starter recipes'));
    } finally {
      setSeeding(false);
    }
  };

  let empty: { title: string; body: string; action?: ReactNode } | null = null;
  if (!loading && !list.length) {
    if (recipesStatus === 'error') {
      empty = { title: "Couldn't open the cookbook", body: recipesError };
    } else if (!recipes.length) {
      empty = {
        title: 'The cookbook is empty',
        body: user
          ? `Add the ${STARTER_RECIPES.length} starter recipes to get going, or write your own.`
          : 'Sign in to add the first recipe. Everyone who opens Say Chef will be able to cook it hands-free.',
        action: user ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => void addStarters()} disabled={seeding}>
              {seeding ? 'Adding…' : `Add ${STARTER_RECIPES.length} starter recipes`}
            </button>
            <Link to="/new" className="btn btn-quiet">
              Write a recipe
            </Link>
          </>
        ) : mode === 'firebase' ? (
          <button type="button" className="btn btn-primary" onClick={() => void signIn()}>
            Sign in with Google
          </button>
        ) : null,
      };
    } else if (filters.tab === 'mine' && !filtered) {
      empty = {
        title: "You haven't shared a recipe yet",
        body: 'Write one up. Times like "simmer for 10 minutes" become timers automatically.',
        action: user ? (
          <Link to="/new" className="btn btn-primary">
            <Icon name="plus" size={18} />
            Add a recipe
          </Link>
        ) : null,
      };
    } else if (filters.tab === 'saved' && !filtered) {
      empty = { title: 'Nothing saved yet', body: 'Tap the heart on any recipe to keep it here.' };
    } else {
      empty = {
        title: 'No recipes match',
        body: 'Try fewer words, a different cuisine, or clear the filters.',
        action: (
          <button type="button" className="btn btn-quiet" onClick={clear}>
            Clear filters
          </button>
        ),
      };
    }
  }

  return (
    <div>
      {!query && <Hero count={recipes.length} cuisines={cuisinesPresent.length} />}

      <section className={`flex flex-col gap-4 ${query ? 'pt-6' : ''}`} aria-label="Filters">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Which recipes">
            {(
              [
                ['all', 'All recipes'],
                ['mine', `My recipes${mineCount ? ` · ${mineCount}` : ''}`],
                ['saved', `Saved${favorites.size ? ` · ${favorites.size}` : ''}`],
              ] as Array<[BrowseFilters['tab'], string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filters.tab === key}
                onClick={() => set('tab', key)}
                className={`tabular rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition ${filters.tab === key ? 'bg-enamel text-enamel-ink' : 'text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="filter-diet">
              Diet
            </label>
            <select id="filter-diet" className="field field-sm w-auto" value={filters.diet} onChange={e => set('diet', e.target.value)}>
              <option value="Any">Any diet</option>
              {DIETS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-time">
              Total time
            </label>
            <select id="filter-time" className="field field-sm w-auto" value={filters.time} onChange={e => set('time', e.target.value)}>
              {TIMES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-level">
              Difficulty
            </label>
            <select id="filter-level" className="field field-sm w-auto" value={filters.level} onChange={e => set('level', e.target.value)}>
              <option value="Any">Any level</option>
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-sort">
              Sort
            </label>
            <select
              id="filter-sort"
              className="field field-sm w-auto"
              value={filters.sort}
              onChange={e => set('sort', e.target.value as BrowseFilters['sort'])}
              disabled={pantry && !!query}
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cuisinesPresent.length > 1 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {['All', ...cuisinesPresent].map(c => (
              <button key={c} type="button" className="chip" aria-pressed={filters.cuisine === c} onClick={() => set('cuisine', c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {filtered && !loading && (
          <div className="tabular flex flex-wrap items-center gap-3 text-[14px] text-muted" aria-live="polite">
            <span>
              {list.length} recipe{list.length === 1 ? '' : 's'}
              {query ? (pantry ? ' that use what you listed' : ` for “${query}”`) : ''}
            </span>
            <button type="button" className="font-semibold text-enamel underline-offset-4 hover:underline" onClick={clear}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section
        aria-label="Recipes"
        aria-busy={loading}
        className="mt-5 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]"
      >
        {loading
          ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
          : list.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                saved={favorites.has(r.id)}
                onToggleSave={() => toggleFavorite(r.id)}
                pantry={pantryInfo.get(r.id)}
              />
            ))}
      </section>

      {empty && (
        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-dashed border-line px-6 py-12 text-center">
          <div className="w-40">
            <PlateArt seed="empty" plate="stack" className="aspect-[4/3] overflow-hidden rounded-xl opacity-80" />
          </div>
          <h2 className="font-display text-[24px] text-ink">{empty.title}</h2>
          <p className="text-muted">{empty.body}</p>
          {empty.action && <div className="mt-1 flex flex-wrap justify-center gap-2">{empty.action}</div>}
        </div>
      )}
    </div>
  );
}

function Hero({ count, cuisines }: { count: number; cuisines: number }) {
  return (
    <section className="grid items-center gap-6 py-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10 md:py-10">
      <div className="min-w-0">
        <p className="label" style={{ color: 'var(--enamel)' }}>
          Hands-free kitchen
        </p>
        <h1 className="mt-3 font-display text-[clamp(36px,6vw,62px)] leading-[1.02] tracking-[-0.015em] text-ink">
          Cook with your hands full.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-muted">
          Every recipe reads itself aloud one step at a time and turns its cooking times into timers. Talk to it, tap
          it, or let autoplay carry you to the end.
        </p>
        <p className="tabular mt-4 font-mono text-[12.5px] tracking-[0.08em] text-muted uppercase">
          {count} recipe{count === 1 ? '' : 's'} · {cuisines} cuisine{cuisines === 1 ? '' : 's'}
        </p>
      </div>
      <div className="ticket min-w-0 p-5 shadow-card" aria-label="Example of a spoken cooking exchange">
        <div className="flex items-center justify-between">
          <span className="label">Order of service</span>
          <span className="label tabular">Dal Tadka · 4 of 8</span>
        </div>
        <dl className="mt-4 grid grid-cols-[5.6rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-[15px]">
          <dt className="label pt-[3px]">You</dt>
          <dd className="font-mono text-ink">"next"</dd>
          <dt className="label pt-[3px]" style={{ color: 'var(--enamel)' }}>
            Say Chef
          </dt>
          <dd className="text-ink">
            Step 4 of 8. Add the onion and sauté for 6 minutes until golden.
            <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[12.5px] text-ink">
              <Icon name="timer" size={14} />
              6:00 timer ready
            </span>
          </dd>
          <dt className="label pt-[3px]">You</dt>
          <dd className="font-mono text-ink">"start timer"</dd>
          <dt className="label pt-[3px]" style={{ color: 'var(--enamel)' }}>
            Say Chef
          </dt>
          <dd className="text-ink">Timer set for 6 minutes.</dd>
        </dl>
      </div>
    </section>
  );
}
