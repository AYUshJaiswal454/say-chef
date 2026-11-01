import { useEffect, useRef, useState } from 'react';
import { useMic } from '../hooks/voice';
import { createListener, type SpeechListener } from '../lib/voice/recognition';
import { Link, useRouter } from '../lib/router';
import { useApp } from '../state/app';
import { usePrefs, type Theme } from '../state/prefs';
import { useToast } from '../state/toasts';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';

interface HeaderProps {
  query: string;
  onQuery: (q: string) => void;
  pantry: boolean;
  onPantry: (on: boolean) => void;
}

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const THEME_LABEL: Record<Theme, string> = { system: 'Theme: match device', light: 'Theme: light', dark: 'Theme: dark' };

export function Header({ query, onQuery, pantry, onPantry }: HeaderProps) {
  const { path, navigate } = useRouter();
  const { user, mode, authReady, signIn, signOut } = useApp();
  const { theme, setTheme } = usePrefs();
  const mic = useMic();
  const toast = useToast();
  const [listening, setListening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const listener = useRef<SpeechListener | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => listener.current?.stop(), []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const toBrowse = () => {
    if (path !== '/') navigate('/');
  };

  const voiceSearch = () => {
    if (!mic.ok) {
      toast(mic.reason);
      return;
    }
    if (listening) {
      listener.current?.stop();
      return;
    }
    listener.current = createListener({
      continuous: false,
      onStateChange: setListening,
      onText: text => {
        onQuery(text.replace(/[.?!]$/, ''));
        toBrowse();
      },
      onError: () => setListening(false),
    });
    listener.current?.start();
  };

  return (
    <header className="sticky z-30 border-b border-line bg-surface" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="gutter">
        <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
          <Link
            to="/"
            onClick={() => onQuery('')}
            className="flex shrink-0 items-center gap-2 rounded-xl"
            aria-label="Say Chef, all recipes"
          >
            <Logo />
            <span className="font-display text-[25px] leading-none tracking-[-0.01em] text-ink">Say Chef</span>
          </Link>

          <div className="order-3 w-full min-w-0 md:order-none md:w-auto md:flex-1">
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-muted">
                <Icon name={pantry ? 'basket' : 'search'} size={18} />
              </span>
              <input
                id="search"
                type="search"
                value={query}
                onChange={e => {
                  onQuery(e.target.value);
                  toBrowse();
                }}
                placeholder={pantry ? 'What do you have? e.g. rice, eggs, spring onion' : 'Search recipes, ingredients or cuisines'}
                aria-label={pantry ? 'Ingredients you have, separated by commas' : 'Search recipes'}
                className="field h-11 rounded-full pr-[7.4rem] pl-10"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPantry(!pantry)}
                  aria-pressed={pantry}
                  title="Match recipes to what's in your kitchen"
                  className={`rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold transition ${pantry ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}
                >
                  Pantry
                </button>
                <button
                  type="button"
                  onClick={voiceSearch}
                  aria-pressed={listening}
                  aria-label="Search by voice"
                  title={mic.ok ? 'Search by voice' : mic.reason}
                  className={`grid h-8 w-8 place-items-center rounded-full transition ${listening ? 'bg-tomato text-white' : mic.ok ? 'text-enamel hover:bg-enamel-soft' : 'text-muted opacity-70'}`}
                >
                  <Icon name={mic.ok ? 'mic' : 'micOff'} size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(THEME_NEXT[theme])}
              aria-label={`${THEME_LABEL[theme]}. Change theme`}
              title={THEME_LABEL[theme]}
            >
              <Icon name={THEME_ICON[theme]} size={18} />
            </button>
            {user && path !== '/new' && (
              <Link to="/new" className="btn btn-primary">
                <Icon name="plus" size={18} />
                <span className="hidden sm:inline">Add recipe</span>
                <span className="sm:hidden">Add</span>
              </Link>
            )}
            {mode === 'firebase' && authReady && !user && (
              <button type="button" className="btn btn-primary" onClick={() => void signIn()}>
                Sign in
              </button>
            )}
            {mode === 'firebase' && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-line"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Your account"
                >
                  <Avatar name={user.name} photoURL={user.photoURL} size={32} />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-lift"
                  >
                    <p className="truncate px-3 py-2 text-[14px] text-muted">
                      Signed in as <span className="font-semibold text-ink">{user.name}</span>
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14.5px] font-semibold text-ink hover:bg-sunken"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut();
                      }}
                    >
                      <Icon name="logOut" size={17} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
