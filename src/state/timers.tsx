import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { playChime, primeAudio } from '../lib/sound';
import { tts } from '../lib/voice/speech';
import { usePrefs } from './prefs';

/**
 * Kitchen timers. They live at the top of the app, so they keep running while the cook
 * moves between the recipe page and cooking mode. A finished timer chimes, speaks,
 * and flashes the tab title until it's dismissed.
 */

export interface KitchenTimer {
  id: string;
  label: string;
  /** Total length in seconds (grows with "+1 min"). */
  secs: number;
  /** When it rings; null while paused or finished. */
  endsAt: number | null;
  /** Milliseconds left while paused. */
  left: number;
  done: boolean;
  recipeId: string | null;
  /** Step index the timer belongs to; -1 for a timer the cook asked for by voice. */
  step: number;
  /** Which time in the step ("fry 2 minutes, then simmer 20 minutes" has two). */
  seq: number;
  /** Started by autoplay, which moves on when it rings. */
  auto: boolean;
}

export interface StartTimer {
  label: string;
  secs: number;
  recipeId?: string | null;
  step?: number;
  seq?: number;
  auto?: boolean;
}

interface TimersValue {
  timers: KitchenTimer[];
  now: number;
  start(t: StartTimer): void;
  pause(id: string): void;
  resume(id: string): void;
  addMinute(id: string): void;
  dismiss(id: string): void;
}

const TimersContext = createContext<TimersValue | null>(null);

export function useTimers(): TimersValue {
  const value = useContext(TimersContext);
  if (!value) throw new Error('useTimers must be used inside <TimersProvider>');
  return value;
}

export function remainingMs(t: KitchenTimer, now: number): number {
  if (t.done) return 0;
  return t.endsAt !== null ? Math.max(0, t.endsAt - now) : t.left;
}

let sequence = 0;

export function TimersProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const { prefs } = usePrefs();
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const running = timers.some(t => t.endsAt !== null && !t.done);
  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(iv);
  }, [running]);

  // Ring anything that's due.
  useEffect(() => {
    const due = timers.filter(t => t.endsAt !== null && !t.done && t.endsAt <= now);
    if (!due.length) return;
    const ids = new Set(due.map(t => t.id));
    setTimers(list => list.map(t => (ids.has(t.id) ? { ...t, done: true, endsAt: null, left: 0 } : t)));
    playChime();
    const p = prefsRef.current;
    void tts.speak(due.map(t => `${t.label.replace(' · ', ', ')} timer is done.`).join(' '), {
      rate: p.rate,
      voiceURI: p.voiceURI,
    });
  }, [now, timers]);

  // Flash the tab title while an alarm is ringing, for cooks in another tab.
  const ringing = timers.some(t => t.done);
  useEffect(() => {
    if (!ringing) return;
    const original = document.title;
    let on = false;
    const iv = window.setInterval(() => {
      on = !on;
      document.title = on ? "⏰ Time's up" : original;
    }, 900);
    return () => {
      window.clearInterval(iv);
      document.title = original;
    };
  }, [ringing]);

  const value = useMemo<TimersValue>(
    () => ({
      timers,
      now,
      start: ({ label, secs, recipeId = null, step = -1, seq = 0, auto = false }) => {
        primeAudio();
        const at = Date.now();
        setTimers(list => [
          ...list,
          { id: `t${++sequence}`, label, secs, endsAt: at + secs * 1000, left: 0, done: false, recipeId, step, seq, auto },
        ]);
        setNow(at);
      },
      pause: id =>
        setTimers(list =>
          list.map(t => (t.id === id && t.endsAt !== null ? { ...t, left: Math.max(0, t.endsAt - Date.now()), endsAt: null } : t)),
        ),
      resume: id =>
        setTimers(list =>
          list.map(t => (t.id === id && t.endsAt === null && !t.done ? { ...t, endsAt: Date.now() + t.left, left: 0 } : t)),
        ),
      addMinute: id =>
        setTimers(list =>
          list.map(t => {
            if (t.id !== id) return t;
            if (t.done) return { ...t, done: false, auto: false, secs: 60, endsAt: Date.now() + 60_000, left: 0 };
            if (t.endsAt !== null) return { ...t, endsAt: t.endsAt + 60_000, secs: t.secs + 60 };
            return { ...t, left: t.left + 60_000, secs: t.secs + 60 };
          }),
        ),
      dismiss: id => setTimers(list => list.filter(t => t.id !== id)),
    }),
    [timers, now],
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}
