import { formatClock } from '../lib/recipe/durations';
import { remainingMs, useTimers, type KitchenTimer } from '../state/timers';
import { Icon } from './Icon';

export function TimerRow({ timer: t, dark = false }: { timer: KitchenTimer; dark?: boolean }) {
  const { now, pause, resume, addMinute, dismiss } = useTimers();
  const left = remainingMs(t, now);
  const paused = !t.done && t.endsAt === null;
  const progress = t.done ? 1 : 1 - left / (t.secs * 1000);
  const control = dark
    ? 'grid h-9 w-9 place-items-center rounded-full border border-cook-line text-cook-ink hover:bg-cook-chip'
    : 'grid h-9 w-9 place-items-center rounded-full border border-line text-ink hover:bg-sunken';
  const doneControl = 'grid h-9 place-items-center rounded-full bg-black/15 px-3 text-[13px] font-bold';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-3.5 py-3 ${dark ? 'border border-cook-line' : 'border border-line bg-surface'} ${t.done ? 'pulse-done' : ''}`}
      style={
        t.done
          ? {
              background: dark ? 'var(--cook-alarm)' : 'var(--tomato)',
              borderColor: 'transparent',
              color: dark ? '#2A0A04' : '#fff',
            }
          : undefined
      }
    >
      {!t.done && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0"
          style={{ width: `${progress * 100}%`, background: dark ? 'rgb(246 190 69 / 0.16)' : 'var(--saffron-soft)' }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[12.5px] font-semibold ${t.done ? '' : dark ? 'text-cook-muted' : 'text-muted'}`}>
            {t.label}
          </p>
          <p className="tabular font-mono text-[24px] leading-tight font-medium" aria-live={t.done ? 'assertive' : 'off'}>
            {t.done ? "Time's up" : formatClock(left)}
          </p>
        </div>
        {!t.done && (
          <button
            type="button"
            className={control}
            onClick={() => (paused ? resume(t.id) : pause(t.id))}
            aria-label={paused ? 'Resume timer' : 'Pause timer'}
          >
            <Icon name={paused ? 'play' : 'pause'} size={15} />
          </button>
        )}
        <button
          type="button"
          className={t.done ? doneControl : control}
          onClick={() => addMinute(t.id)}
          aria-label="Add one minute"
        >
          {t.done ? '+1 min' : <span className="font-mono text-[12px] font-semibold">+1</span>}
        </button>
        <button
          type="button"
          className={t.done ? `${doneControl} w-9 px-0` : control}
          onClick={() => dismiss(t.id)}
          aria-label={t.done ? 'Dismiss alarm' : 'Cancel timer'}
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}

/** Floating timers on the regular pages; cooking mode shows its own. */
export function TimerTray() {
  const { timers } = useTimers();
  if (!timers.length) return null;
  return (
    <aside
      aria-label="Kitchen timers"
      className="fixed z-40 flex w-[min(340px,calc(100vw-32px))] flex-col gap-2"
      style={{
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {timers.map(t => (
        <div key={t.id} className="rounded-2xl shadow-lift">
          <TimerRow timer={t} />
        </div>
      ))}
    </aside>
  );
}
