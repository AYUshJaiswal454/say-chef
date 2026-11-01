import { useEffect, useState, type FormEvent } from 'react';
import { DictateButton } from '../components/DictateButton';
import { Icon } from '../components/Icon';
import { PlateArt } from '../components/PlateArt';
import { CUISINE_NAMES, DIETS, DIFFICULTIES, defaultPlate, type Diet, type Difficulty } from '../data/cuisines';
import type { Recipe } from '../lib/data';
import { describeError } from '../lib/errors';
import { PLATES, PLATE_KEYS, type PlateKey } from '../lib/plateArt';
import { formatClock, formatMinutes, parseDurations } from '../lib/recipe/durations';
import { splitLines } from '../lib/recipe/matching';
import { LIMITS, normaliseRecipeInput, validateRecipeInput, type RecipeErrors } from '../lib/recipe/validate';
import { Link, useRouter } from '../lib/router';
import { readJSON, removeKey, writeJSON } from '../lib/storage';
import { useApp } from '../state/app';
import { useToast } from '../state/toasts';

interface FormState {
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty;
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  diet: Diet[];
  plate: PlateKey | '';
  ingredients: string;
  steps: string;
  notes: string;
}

const BLANK: FormState = {
  title: '',
  description: '',
  cuisine: 'Indian',
  difficulty: 'Easy',
  prepMinutes: '10',
  cookMinutes: '20',
  servings: '2',
  diet: [],
  plate: '',
  ingredients: '',
  steps: '',
  notes: '',
};

const DRAFT_KEY = 'saychef.draft';

function hasContent(f: Partial<FormState> | null): boolean {
  return !!f && !!(f.title || f.description || f.ingredients || f.steps || f.notes);
}

function fromRecipe(r: Recipe): FormState {
  return {
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    prepMinutes: String(r.prepMinutes),
    cookMinutes: String(r.cookMinutes),
    servings: String(r.servings),
    diet: r.diet,
    plate: r.plate,
    ingredients: r.ingredients.join('\n'),
    steps: r.steps.join('\n'),
    notes: r.notes,
  };
}

export function EditRecipePage({ recipe }: { recipe?: Recipe }) {
  const { source, user, mode, signIn } = useApp();
  const { navigate } = useRouter();
  const toast = useToast();
  const [restored, setRestored] = useState(() => !recipe && hasContent(readJSON(DRAFT_KEY, null)));
  const [form, setForm] = useState<FormState>(() => {
    if (recipe) return fromRecipe(recipe);
    const draft = readJSON<Partial<FormState> | null>(DRAFT_KEY, null);
    return hasContent(draft) ? { ...BLANK, ...draft } : BLANK;
  });
  const [errors, setErrors] = useState<RecipeErrors>({});
  const [busy, setBusy] = useState(false);

  // Keep an unsaved draft of a new recipe between visits.
  useEffect(() => {
    if (recipe) return;
    const t = window.setTimeout(() => {
      if (hasContent(form)) writeJSON(DRAFT_KEY, form);
      else removeKey(DRAFT_KEY);
    }, 500);
    return () => window.clearTimeout(t);
  }, [form, recipe]);

  const ingredients = splitLines(form.ingredients, false);
  const steps = splitLines(form.steps, true);
  const timerCount = steps.reduce((n, s) => n + parseDurations(s).length, 0);
  const plate = form.plate || defaultPlate(form.cuisine);

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm(f => ({ ...f, [key]: value }));
  const appendLine = (key: 'ingredients' | 'steps') => (text: string) =>
    setForm(f => ({ ...f, [key]: f[key] ? `${f[key].replace(/\s*$/, '')}\n${text}` : text }));
  const appendText = (key: 'description' | 'notes') => (text: string) =>
    setForm(f => ({ ...f, [key]: f[key] ? `${f[key]} ${text}` : text }));
  const toggleDiet = (d: Diet) =>
    setForm(f => ({ ...f, diet: f.diet.includes(d) ? f.diet.filter(x => x !== d) : [...f.diet, d] }));

  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[20px] border border-line bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-[28px] text-ink">Sign in to share a recipe</h1>
        <p className="mt-2 text-muted">Recipes are shared with everyone who uses this cookbook, so we need to know who wrote them.</p>
        {mode === 'firebase' && (
          <button type="button" className="btn btn-primary mt-5" onClick={() => void signIn()}>
            Sign in with Google
          </button>
        )}
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = normaliseRecipeInput({
      ...form,
      prepMinutes: Number(form.prepMinutes),
      cookMinutes: Number(form.cookMinutes),
      servings: Number(form.servings),
      ingredients,
      steps,
    });
    const found = validateRecipeInput(input);
    setErrors(found);
    const first = found.title ? 'f-title' : found.ingredients ? 'f-ingredients' : found.steps ? 'f-steps' : null;
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    if (!source) return;
    setBusy(true);
    try {
      if (recipe) {
        await source.updateRecipe(user, recipe.id, input);
        toast('Changes saved.');
        navigate(`/recipes/${recipe.id}`, { replace: true });
      } else {
        const id = await source.createRecipe(user, input);
        removeKey(DRAFT_KEY);
        toast('Recipe published.');
        navigate(`/recipes/${id}`, { replace: true });
      }
    } catch (err) {
      toast(describeError(err, 'save the recipe'));
    } finally {
      setBusy(false);
    }
  };

  const discardDraft = () => {
    removeKey(DRAFT_KEY);
    setForm(BLANK);
    setRestored(false);
  };

  const error = (key: keyof RecipeErrors) =>
    errors[key] ? (
      <p className="mt-1.5 text-[13.5px] font-medium text-tomato" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} className="rise pb-8" noValidate>
      <Link
        to={recipe ? `/recipes/${recipe.id}` : '/'}
        className="mt-6 mb-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted hover:text-ink"
      >
        <Icon name="arrowLeft" size={17} />
        {recipe ? 'Back to recipe' : 'All recipes'}
      </Link>
      <h1 className="font-display text-[clamp(30px,4.5vw,44px)] leading-tight text-ink">
        {recipe ? 'Edit recipe' : 'Share a recipe'}
      </h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        Write each step the way you'd say it out loud. Any time you mention, like "simmer for 10 minutes", becomes a
        one-tap timer in cooking mode.
      </p>
      {restored && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-saffron-soft px-4 py-2.5 text-[14px] text-ink">
          Restored your unsaved draft.
          <button type="button" className="font-semibold underline underline-offset-4" onClick={discardDraft}>
            Start fresh
          </button>
        </div>
      )}

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="f-title" className="label">
                Recipe name
              </label>
              <DictateButton onText={t => set('title')(t.replace(/\.$/, ''))} />
            </div>
            <input
              id="f-title"
              className="field mt-1.5 text-[17px]"
              value={form.title}
              onChange={e => set('title')(e.target.value)}
              maxLength={LIMITS.title}
              placeholder="Grandma's rajma chawal"
              aria-invalid={!!errors.title}
            />
            {error('title')}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="f-description" className="label">
                Short description
              </label>
              <DictateButton onText={appendText('description')} />
            </div>
            <textarea
              id="f-description"
              className="field mt-1.5"
              rows={2}
              value={form.description}
              onChange={e => set('description')(e.target.value)}
              maxLength={LIMITS.description}
              placeholder="What makes it worth cooking?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="col-span-2">
              <label htmlFor="f-cuisine" className="label">
                Cuisine
              </label>
              <select id="f-cuisine" className="field mt-1.5" value={form.cuisine} onChange={e => set('cuisine')(e.target.value)}>
                {CUISINE_NAMES.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="label" id="f-level-label">
                Difficulty
              </span>
              <div className="mt-1.5 flex gap-2" role="radiogroup" aria-labelledby="f-level-label">
                {DIFFICULTIES.map(level => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={form.difficulty === level}
                    className="chip flex-1 justify-center py-2.5"
                    onClick={() => set('difficulty')(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            {(
              [
                ['prepMinutes', 'Prep (min)', 0, LIMITS.prepMinutes],
                ['cookMinutes', 'Cook (min)', 0, LIMITS.cookMinutes],
                ['servings', 'Serves', 1, LIMITS.servings],
              ] as const
            ).map(([key, label, min, max]) => (
              <div key={key} className={key === 'servings' ? 'col-span-2 sm:col-span-1' : ''}>
                <label htmlFor={`f-${key}`} className="label">
                  {label}
                </label>
                <input
                  id={`f-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  className="field tabular mt-1.5"
                  value={form[key]}
                  onChange={e => set(key)(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <span className="label">Diet</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DIETS.map(d => (
                <button key={d} type="button" className="chip" aria-pressed={form.diet.includes(d)} onClick={() => toggleDiet(d)}>
                  {form.diet.includes(d) && <Icon name="check" size={14} />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="f-ingredients" className="label">
                Ingredients · one per line
              </label>
              <DictateButton onText={appendLine('ingredients')} label="Dictate a line" />
            </div>
            <textarea
              id="f-ingredients"
              className="field mt-1.5 font-mono text-[14px]"
              rows={9}
              value={form.ingredients}
              onChange={e => set('ingredients')(e.target.value)}
              aria-invalid={!!errors.ingredients}
              placeholder={'1 cup rajma, soaked overnight\n2 onions, finely chopped\n1 tbsp ginger-garlic paste\n1/2 tsp turmeric'}
            />
            <p className="mt-1.5 text-[13px] text-muted">
              Start each line with the amount (1, 1/2, 1½, 200 g) so it scales with servings.
            </p>
            {error('ingredients')}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="f-steps" className="label">
                Steps · one per line
              </label>
              <DictateButton onText={appendLine('steps')} label="Dictate a step" />
            </div>
            <textarea
              id="f-steps"
              className="field mt-1.5"
              rows={9}
              value={form.steps}
              onChange={e => set('steps')(e.target.value)}
              aria-invalid={!!errors.steps}
              placeholder={
                'Pressure cook the rajma for 20 minutes.\nFry the onions in ghee for 8 minutes until deep brown.\nAdd the ginger-garlic paste and cook for 1 minute.'
              }
            />
            {error('steps')}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="f-notes" className="label">
                Cook's note · optional
              </label>
              <DictateButton onText={appendText('notes')} />
            </div>
            <textarea
              id="f-notes"
              className="field mt-1.5"
              rows={2}
              value={form.notes}
              onChange={e => set('notes')(e.target.value)}
              maxLength={LIMITS.notes}
              placeholder="Swaps, make-ahead tips, what to serve it with"
            />
          </div>

          <div>
            <span className="label">Plate</span>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              <button
                type="button"
                onClick={() => set('plate')('')}
                aria-pressed={!form.plate}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-[11.5px] font-semibold ${!form.plate ? 'border-enamel text-ink' : 'border-transparent text-muted hover:border-line'}`}
              >
                <span className="grid aspect-square w-full place-items-center rounded-lg bg-sunken font-mono text-[11px]">AUTO</span>
                By cuisine
              </button>
              {PLATE_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('plate')(key)}
                  aria-pressed={form.plate === key}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-[11.5px] font-semibold ${form.plate === key ? 'border-enamel text-ink' : 'border-transparent text-muted hover:border-line'}`}
                >
                  <PlateArt seed="swatch" plate={key} className="aspect-square w-full overflow-hidden rounded-lg" />
                  <span className="w-full truncate text-center">{PLATES[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="label">Preview</p>
          <div className="mt-2 overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
            <div className="aspect-[4/3]">
              <PlateArt seed={recipe?.id ?? `new-${form.title || 'recipe'}`} plate={plate} className="h-full w-full" />
            </div>
            <div className="p-4">
              <p className="label">
                {form.cuisine} · {form.difficulty}
              </p>
              <p className="mt-1 font-display text-[21px] leading-tight text-ink">{form.title || 'Untitled recipe'}</p>
              <p className="tabular mt-2 text-[14px] text-muted">
                {formatMinutes((Number(form.prepMinutes) || 0) + (Number(form.cookMinutes) || 0))} · serves{' '}
                {form.servings || 1} · {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[20px] border border-line bg-surface p-4">
            <p className="font-semibold text-ink">Hands-free check</p>
            <p className="tabular mt-0.5 text-[13.5px] text-muted">
              {steps.length} step{steps.length === 1 ? '' : 's'} · {timerCount} timer{timerCount === 1 ? '' : 's'} found
            </p>
            <ol className="mt-3 space-y-2">
              {steps.slice(0, 12).map((s, i) => {
                const durations = parseDurations(s);
                return (
                  <li key={i} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 text-[13.5px]">
                    <span className="tabular font-mono text-enamel">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 text-ink">{s}</span>
                      {durations.length > 0 && (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {durations.map((d, k) => (
                            <span key={k} className="tabular rounded-full bg-saffron-soft px-2 py-0.5 font-mono text-[11.5px] text-ink">
                              {formatClock(d.secs * 1000)}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
              {!steps.length && <li className="text-[13.5px] text-muted">Steps you write appear here with their timers.</li>}
            </ol>
          </div>
        </aside>
      </div>

      <div
        className="sticky z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <span className="tabular text-[13.5px] text-muted">
          {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'} · {steps.length} step
          {steps.length === 1 ? '' : 's'} · {timerCount} timer{timerCount === 1 ? '' : 's'}
        </span>
        <div className="flex gap-2">
          <Link to={recipe ? `/recipes/${recipe.id}` : '/'} className="btn btn-quiet">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : recipe ? 'Save changes' : 'Publish recipe'}
          </button>
        </div>
      </div>
    </form>
  );
}
