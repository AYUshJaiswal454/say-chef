import { useEffect, useState } from 'react';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Logo } from './components/Logo';
import { TimerTray } from './components/Timers';
import { usePersistentState } from './hooks/usePersistentState';
import { LIMITS } from './lib/recipe/validate';
import { Link, matchPath, useRouter } from './lib/router';
import { BrowsePage, DEFAULT_FILTERS, type BrowseFilters } from './pages/BrowsePage';
import { CookPage } from './pages/CookPage';
import { EditRecipePage } from './pages/EditRecipePage';
import { RecipePage } from './pages/RecipePage';
import { useApp } from './state/app';

const REPO_URL = 'https://github.com/AYUshJaiswal454/say-chef';

export default function App() {
  const { path, search } = useRouter();
  const { recipes, recipesStatus, mode, user } = useApp();
  const [query, setQuery] = useState('');
  const [pantry, setPantry] = usePersistentState('saychef.pantry', false);
  const [filters, setFilters] = usePersistentState<BrowseFilters>('saychef.filters', DEFAULT_FILTERS);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const recipeMatch = matchPath('/recipes/:id', path);
  const editMatch = matchPath('/recipes/:id/edit', path);
  const cookMatch = matchPath('/recipes/:id/cook', path);
  const id = recipeMatch?.id ?? editMatch?.id ?? cookMatch?.id;
  const recipe = id ? recipes.find(r => r.id === id) : undefined;
  const loading = recipesStatus === 'loading';

  useEffect(() => {
    document.title = recipe ? `${recipe.title} · Say Chef` : 'Say Chef';
  }, [recipe]);

  let page;
  if (id && !recipe) {
    page = loading ? <PageLoading /> : <NotFound what="recipe" />;
  } else if (cookMatch && recipe) {
    const serves = Number(search.get('serves'));
    const servings = Number.isInteger(serves) && serves >= 1 && serves <= LIMITS.servings ? serves : recipe.servings;
    page = <CookPage key={recipe.id} recipe={recipe} servings={servings} />;
  } else if (editMatch && recipe) {
    page =
      user && user.uid === recipe.authorId ? (
        <EditRecipePage key={recipe.id} recipe={recipe} />
      ) : (
        <NotFound what="editor" />
      );
  } else if (recipeMatch && recipe) {
    page = <RecipePage key={recipe.id} recipe={recipe} confirm={setConfirm} />;
  } else if (path === '/new') {
    page = <EditRecipePage key="new" />;
  } else if (path === '/') {
    page = (
      <BrowsePage
        query={query}
        pantry={pantry}
        filters={filters}
        setFilters={setFilters}
        onClearQuery={() => setQuery('')}
      />
    );
  } else {
    page = <NotFound what="page" />;
  }

  return (
    <>
      <Header query={query} onQuery={setQuery} pantry={pantry} onPantry={setPantry} />
      {mode === 'demo' && (
        <div className="gutter border-b border-line bg-sunken">
          <div className="wrap flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-[13.5px] text-muted">
            <Icon name="info" size={15} />
            <span>Demo mode: recipes and reviews you add are kept in this browser only.</span>
            <a
              className="font-semibold text-enamel underline-offset-4 hover:underline"
              href={`${REPO_URL}/blob/main/docs/FIREBASE_SETUP.md`}
              target="_blank"
              rel="noreferrer"
            >
              Connect Firebase to share them
            </a>
          </div>
        </div>
      )}
      <main className="gutter">
        <div className="wrap pb-24">{page}</div>
      </main>
      <footer className="gutter border-t border-line">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-display text-[16px] text-ink">Say Chef</span>
          </span>
          <span className="max-w-[60ch]">
            {mode === 'firebase'
              ? 'Recipes and reviews are shared with everyone who uses this cookbook.'
              : 'Recipes stay on this device.'}{' '}
            Speech is handled by your browser.
          </span>
          <a
            className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-enamel"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="github" size={16} />
            Open source on GitHub
          </a>
        </div>
      </footer>
      {!cookMatch && <TimerTray />}
      {confirm && <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}

function PageLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted" aria-busy="true">
      <p className="label">Opening the cookbook…</p>
    </div>
  );
}

function NotFound({ what }: { what: 'recipe' | 'editor' | 'page' }) {
  const copy = {
    recipe: ["That recipe isn't here", 'It may have been deleted by its author.'],
    editor: ['Only the author can edit this recipe', 'You can still cook it, save it and review it.'],
    page: ["That page doesn't exist", 'The link may be mistyped.'],
  }[what];
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="font-display text-[32px] text-ink">{copy[0]}</h1>
      <p className="mt-2 text-muted">{copy[1]}</p>
      <Link to="/" className="btn btn-primary mt-6">
        Browse recipes
      </Link>
    </div>
  );
}
