import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

/**
 * A tiny History API router: Say Chef has five screens, so a routing library would be
 * more code than the app needs. Paths are relative to Vite's BASE_URL, so the same build
 * works at the domain root and under /say-chef/ on GitHub Pages.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

interface Location {
  path: string;
  search: URLSearchParams;
}

interface RouterValue extends Location {
  navigate(to: string, options?: { replace?: boolean }): void;
}

function readLocation(): Location {
  const raw = window.location.pathname;
  const path = (BASE && raw.startsWith(BASE) ? raw.slice(BASE.length) : raw) || '/';
  return { path, search: new URLSearchParams(window.location.search) };
}

export function href(to: string): string {
  return BASE + (to.startsWith('/') ? to : `/${to}`);
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options: { replace?: boolean } = {}) => {
    const url = href(to);
    if (options.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setLocation(readLocation());
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside <RouterProvider>');
  return value;
}

/** Matches "/recipes/:id/edit" against a path and returns the params, or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string };

export function Link({ to, onClick, target, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={href(to)} target={target} onClick={handle} {...rest} />;
}
