import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import type { ConfirmRequest } from '../components/ConfirmDialog';
import { DictateButton } from '../components/DictateButton';
import { Icon } from '../components/Icon';
import { PlateArt } from '../components/PlateArt';
import { StarInput, Stars } from '../components/Stars';
import { defaultPlate } from '../data/cuisines';
import { averageRating, totalMinutes, type Recipe, type Review } from '../lib/data';
import { describeError } from '../lib/errors';
import { formatClock, formatDuration, formatMinutes, parseDurations } from '../lib/recipe/durations';
import { scaleParts } from '../lib/recipe/quantities';
import { LIMITS } from '../lib/recipe/validate';
import { Link, useRouter } from '../lib/router';
import { primeAudio } from '../lib/sound';
import { tts } from '../lib/voice/speech';
import { useApp } from '../state/app';
import { usePrefs } from '../state/prefs';
import { remainingMs, useTimers } from '../state/timers';
import { useToast } from '../state/toasts';

interface RecipePageProps {
  recipe: Recipe;
  confirm: (request: ConfirmRequest) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function RecipePage({ recipe: r, confirm }: RecipePageProps) {
  const { user, source, favorites, toggleFavorite } = useApp();
  const { prefs } = usePrefs();
  const { timers, now, start } = useTimers();
  const { navigate } = useRouter();
  const toast = useToast();
  const [servings, setServings] = useState(r.servings);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const reviewsRef = useRef<HTMLDivElement>(null);

  const factor = servings / r.servings;
  const lines = r.ingredients.map(line => scaleParts(line, factor));
  const avg = averageRating(r);
  const saved = favorites.has(r.id);
  const isAuthor = !!user && user.uid === r.authorId;
  const voice = { rate: prefs.rate, voiceURI: prefs.voiceURI };

  const toggleChecked = (i: number) =>
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const readIngredients = () =>
    void tts.speak(
      `Ingredients for ${servings} serving${servings === 1 ? '' : 's'}. ` +
        lines.map(p => (p.q ? `${p.q} ${p.rest}` : p.rest)).join('. '),
      voice,
    );

  const askDelete = () =>
    confirm({
      title: `Delete ${r.title}?`,
      body: 'The recipe disappears for everyone who opens this cookbook, along with its reviews.',
      confirmLabel: 'Delete recipe',
      onConfirm: () => {
        source
          ?.deleteRecipe(r.id)
          .then(() => {
            toast('Recipe deleted.');
            navigate('/', { replace: true });
          })
          .catch(e => toast(describeError(e, 'delete this recipe')));
      },
    });

  return (
    <article className="rise">
      <Link
        to="/"
        className="mt-6 mb-5 inline-flex items-center gap-1.5 rounded-full text-[14px] font-semibold text-muted hover:text-ink"
      >
        <Icon name="arrowLeft" size={17} />
        All recipes
      </Link>

      <header className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-line shadow-card">
            <PlateArt seed={r.id} plate={r.plate || defaultPlate(r.cuisine)} className="h-full w-full" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="label">
            {r.cuisine} · {r.difficulty}
            {r.starter ? ' · Starter recipe' : ''}
          </div>
          <h1 className="mt-2 font-display text-[clamp(32px,5vw,52px)] leading-[1.04] tracking-[-0.012em] text-ink">
            {r.title}
          </h1>
          {r.description && <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-muted">{r.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted">
            <span className="inline-flex items-center gap-2">
              <Avatar name={r.authorName} photoURL={r.authorPhoto} size={26} />
              <span>
                by <span className="font-semibold text-ink">{isAuthor ? 'You' : r.authorName || 'A home cook'}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="tabular inline-flex items-center gap-1.5 hover:text-ink"
            >
              <Stars value={avg} />
              {r.ratingCount ? (
                <span>
                  <span className="font-semibold text-ink">{avg.toFixed(1)}</span> · {r.ratingCount} review
                  {r.ratingCount === 1 ? '' : 's'}
                </span>
              ) : (
                'No reviews yet'
              )}
            </button>
          </div>

          <dl className="tabular mt-5 grid grid-cols-4 overflow-hidden rounded-2xl border border-line bg-surface">
            {(
              [
                ['Prep', formatMinutes(r.prepMinutes)],
                ['Cook', formatMinutes(r.cookMinutes)],
                ['Total', formatMinutes(totalMinutes(r))],
                ['Steps', String(r.steps.length)],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={`min-w-0 px-3 py-3 ${i ? 'border-l border-line' : ''}`}>
                <dt className="label">{k}</dt>
                <dd className="mt-1 truncate text-[16px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {r.diet.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.diet.map(d => (
                <span key={d} className="rounded-md bg-sunken px-2 py-0.5 text-[12.5px] font-semibold text-muted">
                  {d}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              to={`/recipes/${r.id}/cook${servings !== r.servings ? `?serves=${servings}` : ''}`}
              className="btn btn-primary btn-lg"
              onClick={() => primeAudio()}
            >
              <Icon name="play" size={18} />
              Start hands-free cooking
            </Link>
            <button type="button" className="btn btn-quiet" onClick={() => toggleFavorite(r.id)} aria-pressed={saved}>
              <Icon name={saved ? 'heartFill' : 'heart'} size={17} className={saved ? 'text-tomato' : ''} />
              {saved ? 'Saved' : 'Save'}
            </button>
            {isAuthor && (
              <>
                <Link to={`/recipes/${r.id}/edit`} className="btn btn-quiet">
                  <Icon name="edit" size={17} />
                  Edit
                </Link>
                <button type="button" className="btn btn-danger" onClick={askDelete} aria-label="Delete recipe">
                  <Icon name="trash" size={17} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[24px] text-ink">Ingredients</h2>
              <button type="button" className="icon-btn" onClick={readIngredients} aria-label="Read ingredients aloud" title="Read aloud">
                <Icon name="volume" size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-sunken px-3 py-2">
              <span className="text-[14px] font-medium text-muted">Servings</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink disabled:opacity-40"
                  onClick={() => setServings(s => Math.max(1, s - 1))}
                  disabled={servings <= 1}
                  aria-label="Fewer servings"
                >
                  <Icon name="minus" size={16} />
                </button>
                <span className="tabular w-8 text-center font-mono text-[17px] font-medium text-ink" aria-live="polite">
                  {servings}
                </span>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink disabled:opacity-40"
                  onClick={() => setServings(s => Math.min(LIMITS.servings, s + 1))}
                  disabled={servings >= LIMITS.servings}
                  aria-label="More servings"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {lines.map((p, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => toggleChecked(i)}
                      className="mt-1 h-[18px] w-[18px] shrink-0 rounded"
                    />
                    <span className={`min-w-0 text-[15.5px] leading-snug ${checked.has(i) ? 'text-muted line-through' : 'text-ink'}`}>
                      {p.q && <span className="tabular font-mono font-medium">{p.q} </span>}
                      {p.rest}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="tabular mt-2 font-mono text-[12px] text-muted">
              {checked.size} of {lines.length} ready
              {factor !== 1 ? ` · scaled ×${Math.round(factor * 100) / 100}` : ''}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <h2 className="font-display text-[28px] text-ink">Method</h2>
          <ol className="mt-4 flex flex-col">
            {r.steps.map((step, i) => (
              <li
                key={i}
                className="grid grid-cols-[2.6rem_minmax(0,1fr)] gap-x-3 border-t border-line py-5 first:border-t-0 first:pt-1"
              >
                <span className="tabular font-mono text-[15px] font-medium text-enamel">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink">{step}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {parseDurations(step).map((d, k) => {
                      const t = timers.find(x => x.recipeId === r.id && x.step === i && x.seq === k);
                      const tone = t ? (t.done ? 'bg-tomato text-white' : 'bg-ink text-bg') : 'bg-saffron-soft text-ink hover:brightness-95';
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            if (!t) start({ label: `Step ${i + 1} · ${r.title}`, secs: d.secs, recipeId: r.id, step: i, seq: k });
                          }}
                          className={`tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[13px] font-medium transition ${tone}`}
                          aria-label={t ? `Timer running, ${formatClock(remainingMs(t, now))} left` : `Start ${formatDuration(d.secs)} timer`}
                        >
                          <Icon name="timer" size={14} />
                          {t ? (t.done ? 'Done' : formatClock(remainingMs(t, now))) : `Start ${formatClock(d.secs * 1000)}`}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => void tts.speak(`Step ${i + 1}. ${step}`, voice)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-muted hover:bg-sunken hover:text-ink"
                      aria-label={`Read step ${i + 1} aloud`}
                    >
                      <Icon name="volume" size={15} />
                      Listen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {r.notes && (
            <div className="mt-4 rounded-2xl bg-saffron-soft px-5 py-4">
              <p className="label" style={{ color: 'var(--ink)' }}>
                Cook's note
              </p>
              <p className="mt-1.5 max-w-[62ch] text-[15.5px] leading-relaxed whitespace-pre-line text-ink">{r.notes}</p>
            </div>
          )}
        </section>
      </div>

      <div ref={reviewsRef} id="reviews" className="scroll-mt-24">
        <Reviews recipe={r} confirm={confirm} />
      </div>
    </article>
  );
}

function Reviews({ recipe: r, confirm }: { recipe: Recipe; confirm: (request: ConfirmRequest) => void }) {
  const { source, user, mode, signIn } = useApp();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!source) return;
    return source.watchReviews(
      r.id,
      list => {
        setReviews(list);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [source, r.id]);

  const mine = user ? reviews.find(x => x.authorId === user.uid) : undefined;
  const others = reviews.filter(x => x.authorId !== user?.uid);
  const isAuthor = !!user && user.uid === r.authorId;
  const showForm = !!user && !isAuthor && (editing || !mine);

  const startEdit = () => {
    setRating(mine?.rating ?? 0);
    setText(mine?.text ?? '');
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!source || !user || !rating) return;
    setBusy(true);
    try {
      await source.saveReview(user, r.id, { rating, text });
      toast(mine ? 'Review updated.' : 'Thanks! Your review is up.');
      setEditing(false);
      setRating(0);
      setText('');
    } catch (err) {
      toast(describeError(err, 'post your review'));
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    confirm({
      title: 'Delete your review?',
      body: 'Your rating and comment will be gone for everyone.',
      confirmLabel: 'Delete review',
      onConfirm: () => {
        if (!source || !user) return;
        source
          .deleteReview(user, r.id)
          .then(() => toast('Review deleted.'))
          .catch(err => toast(describeError(err, 'delete your review')));
      },
    });

  const counts = [5, 4, 3, 2, 1].map(n => ({ n, c: reviews.filter(x => x.rating === n).length }));
  const avg = averageRating(r);
  const listed = mine && !editing ? [mine, ...others] : others;

  return (
    <section className="mt-14 border-t border-line pt-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-display text-[28px] text-ink">
        Reviews
      </h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-end gap-4">
            <span className="tabular font-display text-[56px] leading-none text-ink">{r.ratingCount ? avg.toFixed(1) : '–'}</span>
            <div className="pb-1.5">
              <Stars value={avg} size={18} />
              <p className="tabular mt-1 text-[14px] text-muted">
                {r.ratingCount} review{r.ratingCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {counts.map(({ n, c }) => (
              <div key={n} className="tabular grid grid-cols-[1.4rem_minmax(0,1fr)_2rem] items-center gap-2 text-[13px] text-muted">
                <span className="font-mono">{n}★</span>
                <span className="h-2 overflow-hidden rounded-full bg-sunken">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%`, background: 'var(--star)' }}
                  />
                </span>
                <span className="text-right font-mono">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          {showForm && (
            <form onSubmit={submit} className="rounded-[20px] border border-line bg-surface p-5 shadow-card">
              <p className="font-semibold text-ink">{mine ? 'Update your review' : 'Cooked it? Rate it.'}</p>
              <div className="mt-2">
                <StarInput value={rating} onChange={setRating} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <label htmlFor="review-text" className="label">
                  What would you tell the next cook?
                </label>
                <DictateButton onText={t => setText(x => (x ? `${x} ${t}` : t))} />
              </div>
              <textarea
                id="review-text"
                className="field mt-1.5"
                rows={3}
                maxLength={LIMITS.reviewText}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Added extra garlic, took 5 minutes longer on my stove…"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="submit" className="btn btn-primary" disabled={!rating || busy}>
                  {busy ? 'Posting…' : mine ? 'Update review' : 'Post review'}
                </button>
                {mine && (
                  <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                )}
                {!rating && <span className="text-[13px] text-muted">Pick a star rating to post.</span>}
              </div>
            </form>
          )}
          {isAuthor && (
            <p className="rounded-2xl bg-sunken px-4 py-3 text-[14px] text-muted">
              This is your recipe, so reviews come from other cooks.
            </p>
          )}
          {!user && mode === 'firebase' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3 text-[14px] text-muted">
              <span>Sign in to rate this recipe and leave a review.</span>
              <button type="button" className="btn btn-quiet" onClick={() => void signIn()}>
                Sign in with Google
              </button>
            </div>
          )}

          <ul className="mt-4 divide-y divide-line">
            {listed.map(rv => {
              const own = rv.authorId === user?.uid;
              return (
                <li key={rv.authorId} className="flex gap-3 py-4">
                  <Avatar name={rv.authorName} photoURL={rv.authorPhoto} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-ink">{own ? 'You' : rv.authorName || 'A home cook'}</span>
                      <Stars value={rv.rating} size={14} />
                      <span className="text-[13px] text-muted">{dateFormat.format(new Date(rv.updatedAt))}</span>
                    </div>
                    {rv.text && (
                      <p className="mt-1 max-w-[62ch] text-[15.5px] leading-relaxed whitespace-pre-line text-ink">{rv.text}</p>
                    )}
                    {own && (
                      <div className="mt-1.5 flex gap-3">
                        <button type="button" className="text-[13px] font-semibold text-enamel hover:underline" onClick={startEdit}>
                          Edit
                        </button>
                        <button type="button" className="text-[13px] font-semibold text-tomato hover:underline" onClick={remove}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {loaded && !reviews.length && <p className="mt-2 text-muted">No reviews yet. The first cook to try it sets the bar.</p>}
        </div>
      </div>
    </section>
  );
}
