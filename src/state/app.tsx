import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { getDataSource, type CookUser, type DataSource, type Recipe } from '../lib/data';
import { describeError } from '../lib/errors';
import { DEFAULT_PREFS, PrefsContext, type Theme, type VoicePrefs } from './prefs';
import { TimersProvider } from './timers';
import { ToastProvider, useToast } from './toasts';

interface AppValue {
  source: DataSource | null;
  mode: DataSource['mode'] | null;
  user: CookUser | null;
  authReady: boolean;
  recipes: Recipe[];
  recipesStatus: 'loading' | 'ready' | 'error';
  recipesError: string;
  favorites: Set<string>;
  toggleFavorite(recipeId: string): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProviders>');
  return value;
}

function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [source, setSource] = useState<DataSource | null>(null);
  const [user, setUser] = useState<CookUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesStatus, setRecipesStatus] = useState<AppValue['recipesStatus']>('loading');
  const [recipesError, setRecipesError] = useState('');
  const [remoteFavorites, setRemoteFavorites] = useState<string[]>([]);
  const [localFavorites, setLocalFavorites] = usePersistentState<string[]>('saychef.favorites', []);

  useEffect(() => {
    let alive = true;
    getDataSource()
      .then(s => {
        if (alive) setSource(s);
      })
      .catch(e => {
        setRecipesStatus('error');
        setRecipesError(describeError(e, 'open the cookbook'));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!source) return;
    const stopAuth = source.onAuthChange(u => {
      setUser(u);
      setAuthReady(true);
    });
    const stopRecipes = source.watchRecipes(
      list => {
        setRecipes(list);
        setRecipesStatus('ready');
        setRecipesError('');
      },
      e => {
        setRecipesStatus('error');
        setRecipesError(describeError(e, 'load recipes'));
      },
    );
    return () => {
      stopAuth();
      stopRecipes();
    };
  }, [source]);

  useEffect(() => {
    if (!source || !user) return;
    return source.watchFavorites(user.uid, setRemoteFavorites);
  }, [source, user]);

  const signedInFavorites = source && user ? remoteFavorites : null;
  const favorites = useMemo(
    () => new Set(signedInFavorites ?? localFavorites),
    [signedInFavorites, localFavorites],
  );

  const toggleFavorite = useCallback(
    (recipeId: string) => {
      const saved = !favorites.has(recipeId);
      if (source && user) {
        source.setFavorite(user.uid, recipeId, saved).catch(e => toast(describeError(e, 'save that')));
      } else {
        setLocalFavorites(list => (saved ? [...list, recipeId] : list.filter(id => id !== recipeId)));
      }
    },
    [favorites, source, user, toast, setLocalFavorites],
  );

  const signIn = useCallback(async () => {
    if (!source) return;
    try {
      await source.signIn();
    } catch (e) {
      toast(describeError(e, 'sign in'));
    }
  }, [source, toast]);

  const signOut = useCallback(async () => {
    if (!source) return;
    try {
      await source.signOut();
      toast('Signed out.');
    } catch (e) {
      toast(describeError(e, 'sign out'));
    }
  }, [source, toast]);

  const value = useMemo<AppValue>(
    () => ({
      source,
      mode: source?.mode ?? null,
      user,
      authReady,
      recipes,
      recipesStatus,
      recipesError,
      favorites,
      toggleFavorite,
      signIn,
      signOut,
    }),
    [source, user, authReady, recipes, recipesStatus, recipesError, favorites, toggleFavorite, signIn, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = usePersistentState<VoicePrefs>('saychef.prefs', DEFAULT_PREFS);
  const [theme, setTheme] = usePersistentState<Theme>('saychef.theme', 'system');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({ prefs, setPrefs: (update: (p: VoicePrefs) => VoicePrefs) => setPrefsState(update), theme, setTheme }),
    [prefs, setPrefsState, theme, setTheme],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <PrefsProvider>
        <DataProvider>
          <TimersProvider>{children}</TimersProvider>
        </DataProvider>
      </PrefsProvider>
    </ToastProvider>
  );
}
