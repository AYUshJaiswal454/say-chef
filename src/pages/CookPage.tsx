import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { TimerRow } from '../components/Timers';
import type { Recipe } from '../lib/data';
import { formatClock, formatDuration, parseDurations, speakDuration } from '../lib/recipe/durations';
import { findIngredient, stepIngredients } from '../lib/recipe/matching';
import { scaleLine } from '../lib/recipe/quantities';
import { useRouter } from '../lib/router';
import { primeAudio } from '../lib/sound';
import { COMMAND_HELP, parseCommand, type Command } from '../lib/voice/commands';
import { createListener, type SpeechListener } from '../lib/voice/recognition';
import { tts } from '../lib/voice/speech';
import { useMic, useSpeaking, useVoices, useWakeLock } from '../hooks/voice';
import { usePrefs } from '../state/prefs';
import { remainingMs, useTimers } from '../state/timers';
import { useToast } from '../state/toasts';

type Panel = 'ingredients' | 'settings' | null;

const PAUSE_OPTIONS: Array<[number, string]> = [
  [0, 'Never, wait for me'],
  [10, '10 seconds'],
  [20, '20 seconds'],
  [30, '30 seconds'],
  [45, '45 seconds'],
  [60, '1 minute'],
];

/**
 * Cooking mode: one step at a time, in type you can read from across the kitchen.
 * Steps are read aloud, times become timers, and the cook can talk, tap or use keys.
 */
export function CookPage({ recipe: r, servings }: { recipe: Recipe; servings: number }) {
  const { navigate } = useRouter();
  const { prefs, setPrefs } = usePrefs();
  const { timers, now, start, dismiss } = useTimers();
  const toast = useToast();
  const mic = useMic();
  const voices = useVoices();
  const speaking = useSpeaking();
  const awake = useWakeLock(true);

  const steps = r.steps;
  const n = steps.length;
  const factor = servings / r.servings;
  const lines = useMemo(() => r.ingredients.map(l => scaleLine(l, factor)), [r.ingredients, factor]);
  const durations = useMemo(() => steps.map(s => parseDurations(s)), [steps]);

  const [idx, setIdx] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [heard, setHeard] = useState<{ text: string; understood: boolean } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  // Refs give the speech and timer callbacks the latest values without re-subscribing.
  const idxRef = useRef(idx);
  const prefsRef = useRef(prefs);
  const timersRef = useRef(timers);
  const runRef = useRef(0);
  const countdownRef = useRef<number | null>(null);
  const listenerRef = useRef<SpeechListener | null>(null);
  const handledAlarms = useRef(new Set<string>());
  useEffect(() => {
    idxRef.current = idx;
    prefsRef.current = prefs;
    timersRef.current = timers;
  });

  const myTimers = timers.filter(t => t.recipeId === r.id);
  const voice = () => ({ rate: prefsRef.current.rate, voiceURI: prefsRef.current.voiceURI });
  const say = useCallback((text: string) => tts.speak(text, { rate: prefsRef.current.rate, voiceURI: prefsRef.current.voiceURI }), []);

  const go = useCallback((i: number) => setIdx(Math.min(Math.max(i, 0), n)), [n]);
  const exit = useCallback(() => navigate(`/recipes/${r.id}`), [navigate, r.id]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
  }, []);

  const startStepTimer = useCallback(
    (step: number, seq: number, auto: boolean) => {
      const d = durations[step]?.[seq];
      if (!d) return;
      start({ label: `Step ${step + 1} · ${r.title}`, secs: d.secs, recipeId: r.id, step, seq, auto });
    },
    [durations, start, r.id, r.title],
  );

  /** What autoplay does after a step is read: start its timer, or count down to the next step. */
  const continueAutoplay = useCallback(
    (step: number, run: number) => {
      if (!prefsRef.current.autoplay || step >= n || run !== runRef.current) return;
      if (durations[step].length) {
        const already = timersRef.current.some(t => t.recipeId === r.id && t.step === step);
        if (!already) startStepTimer(step, 0, true);
        return;
      }
      const pause = prefsRef.current.pause;
      if (!pause) return;
      let left = pause;
      setCountdown(left);
      if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
      countdownRef.current = window.setInterval(() => {
        if (run !== runRef.current) {
          clearCountdown();
          return;
        }
        left -= 1;
        if (left <= 0) {
          clearCountdown();
          go(step + 1);
        } else {
          setCountdown(left);
        }
      }, 1000);
    },
    [n, durations, r.id, startStepTimer, clearCountdown, go],
  );

  const runStep = useCallback(
    async (step: number) => {
      const run = ++runRef.current;
      clearCountdown();
      if (step >= n) {
        if (prefsRef.current.speak) void say(`That was the last step of ${r.title}. Enjoy your meal!`);
        return;
      }
      if (prefsRef.current.speak && tts.supported) {
        const lead = step === 0 ? `Let's cook ${r.title}. ${n} steps. ` : '';
        const result = await say(`${lead}Step ${step + 1} of ${n}. ${steps[step]}`);
        if (run !== runRef.current || result === 'interrupted') return;
      }
      continueAutoplay(step, run);
    },
    [n, r.title, steps, say, clearCountdown, continueAutoplay],
  );

  // Each time the step changes: silence alarms from other steps, then read it.
  useEffect(() => {
    timersRef.current
      .filter(t => t.done && t.recipeId === r.id && t.step >= 0 && t.step !== idx)
      .forEach(t => dismiss(t.id));
    void runStep(idx);
    // runStep is stable for a given recipe; only the step should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Autoplay: when a step's timer rings, start the step's next time or move on.
  useEffect(() => {
    for (const t of timers) {
      if (!t.done || !t.auto || t.recipeId !== r.id || handledAlarms.current.has(t.id)) continue;
      handledAlarms.current.add(t.id);
      if (t.step !== idxRef.current || !prefsRef.current.autoplay) continue;
      const step = t.step;
      if (durations[step][t.seq + 1]) {
        window.setTimeout(() => {
          if (idxRef.current === step && prefsRef.current.autoplay) startStepTimer(step, t.seq + 1, true);
        }, 3000);
      } else {
        window.setTimeout(() => {
          if (idxRef.current === step && prefsRef.current.autoplay) go(step + 1);
        }, 3500);
      }
    }
  }, [timers, r.id, durations, startStepTimer, go]);

  // Leaving cooking mode stops speech, listening and countdowns. Timers keep running.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      runRef.current++;
      tts.stop();
      listenerRef.current?.stop();
      if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    };
  }, []);

  const toggleAutoplay = () => {
    const on = !prefs.autoplay;
    setPrefs(p => ({ ...p, autoplay: on }));
    prefsRef.current = { ...prefsRef.current, autoplay: on };
    if (on) {
      if (!tts.speaking) continueAutoplay(idxRef.current, ++runRef.current);
    } else {
      runRef.current++;
      clearCountdown();
    }
  };

  const doCommand = (cmd: Command) => {
    const i = idxRef.current;
    const mine = timersRef.current.filter(t => t.recipeId === r.id);
    switch (cmd.type) {
      case 'next':
        go(i + 1);
        break;
      case 'prev':
        go(i - 1);
        break;
      case 'repeat':
        void runStep(i);
        break;
      case 'goto':
        go(cmd.step === -1 ? n - 1 : cmd.step - 1);
        break;
      case 'startTimer': {
        if (i < n && durations[i].length) {
          const used = mine.filter(t => t.step === i).map(t => t.seq);
          const seq = durations[i].findIndex((_, k) => !used.includes(k));
          if (seq >= 0) {
            primeAudio();
            startStepTimer(i, seq, false);
            void say(`Timer set for ${speakDuration(durations[i][seq].secs)}.`);
          } else {
            void say('That timer is already running.');
          }
        } else {
          void say("This step doesn't have a time in it. You can say, set a timer for 5 minutes.");
        }
        break;
      }
      case 'customTimer':
        primeAudio();
        start({ label: `${formatDuration(cmd.secs)} timer · ${r.title}`, secs: cmd.secs, recipeId: r.id, step: -1 });
        void say(`Timer set for ${speakDuration(cmd.secs)}.`);
        break;
      case 'timeLeft': {
        const live = timersRef.current.filter(t => !t.done);
        void say(
          live.length
            ? live
                .map(t => `${t.label.split(' · ')[0]}, ${speakDuration(Math.ceil(remainingMs(t, Date.now()) / 1000))} left`)
                .join('. ')
            : 'No timers are running.',
        );
        break;
      }
      case 'dismissAlarms': {
        const ringing = timersRef.current.filter(t => t.done);
        if (ringing.length) ringing.forEach(t => dismiss(t.id));
        else if (mine.length) {
          mine.forEach(t => dismiss(t.id));
          void say('Timers cancelled.');
        }
        break;
      }
      case 'stepIngredients': {
        if (i >= n) {
          void say(`You need: ${lines.join('. ')}`);
          break;
        }
        const here = stepIngredients(steps[i], r.ingredients);
        void say(
          here.length
            ? `For this step: ${here.map(x => lines[x.index]).join('. ')}`
            : "This step doesn't use anything new from the list.",
        );
        break;
      }
      case 'allIngredients':
        void say(`You need: ${lines.join('. ')}`);
        break;
      case 'howMuch': {
        const hit = findIngredient(lines, cmd.query);
        void say(hit ? `${hit}.` : `I couldn't find ${cmd.query} in this recipe.`);
        break;
      }
      case 'peek':
        void say(i + 1 < n ? `Next up: ${steps[i + 1]}` : 'This is the last step.');
        break;
      case 'help':
        void say(`You can say: ${COMMAND_HELP.map(c => c.phrase).join(', ')}.`);
        break;
      case 'stop':
        runRef.current++;
        clearCountdown();
        tts.stop();
        timersRef.current.filter(t => t.done).forEach(t => dismiss(t.id));
        break;
      case 'exit':
        exit();
        break;
    }
  };
  const commandRef = useRef(doCommand);
  useEffect(() => {
    commandRef.current = doCommand;
  });

  // Keyboard shortcuts mirror the voice commands.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' && target?.closest('button, a')) return;
      if (e.key === 'Escape' && panel) {
        e.preventDefault();
        setPanel(null);
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setPanel(p => (p === 'ingredients' ? null : 'ingredients'));
        return;
      }
      const map: Record<string, Command['type']> = {
        ArrowRight: 'next',
        ' ': 'next',
        ArrowLeft: 'prev',
        r: 'repeat',
        R: 'repeat',
        t: 'startTimer',
        T: 'startTimer',
        s: 'stop',
        S: 'stop',
        Escape: 'exit',
      };
      const type = map[e.key];
      if (!type) return;
      e.preventDefault();
      commandRef.current({ type } as Command);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  const toggleListening = () => {
    if (!mic.ok) {
      toast(mic.reason);
      return;
    }
    if (listening) {
      listenerRef.current?.stop();
      setListening(false);
      return;
    }
    listenerRef.current = createListener({
      continuous: true,
      onStateChange: setListening,
      onInterim: setInterim,
      onText: text => {
        setInterim('');
        // Ignore our own voice coming back through the microphone, but let short
        // commands like "stop" or "next" interrupt.
        const short = text.split(/\s+/).length <= 4;
        if ((tts.speaking || Date.now() - tts.lastEndedAt < 500) && !short) return;
        const cmd = parseCommand(text);
        setHeard({ text, understood: !!cmd });
        if (cmd) commandRef.current(cmd);
      },
      onError: code => {
        setListening(false);
        toast(code === 'network' ? 'Speech recognition needs an internet connection.' : 'Microphone access was blocked, so voice commands are off.');
      },
    });
    listenerRef.current?.start();
  };

  const step = idx < n ? steps[idx] : null;
  const here = step ? stepIngredients(step, r.ingredients) : [];
  const stepTimer = (k: number) => myTimers.find(t => t.step === idx && t.seq === k);
  const drawerStyle = {
    paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
    paddingLeft: '20px',
  };

  return (
    <div
      className="speckle fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${r.title}`}
      style={{
        paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="gutter">
        <div className="wrap flex items-center gap-2 py-2">
          <button type="button" className="cbtn h-11 gap-1.5 px-3.5 text-[14px]" onClick={exit} aria-label="Leave cooking mode">
            <Icon name="x" size={18} />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <p className="min-w-0 flex-1 truncate px-1 font-display text-[19px] sm:text-[21px]">{r.title}</p>
          {awake && (
            <span
              className="hidden items-center gap-1 font-mono text-[11.5px] tracking-[0.08em] text-cook-muted uppercase md:inline-flex"
              title="Your screen won't go to sleep while you cook"
            >
              <Icon name="sun" size={14} />
              Screen on
            </span>
          )}
          <button
            type="button"
            className="cbtn h-11 px-3.5 text-[14px]"
            aria-pressed={prefs.autoplay}
            aria-label="Autoplay"
            onClick={toggleAutoplay}
            title="Read each step, run its timer, then move on by itself"
          >
            <Icon name={prefs.autoplay ? 'pause' : 'play'} size={15} />
            <span className="hidden sm:inline">Autoplay</span>
          </button>
          <button
            type="button"
            className="cbtn h-11 w-11"
            onClick={() => setPanel(p => (p === 'ingredients' ? null : 'ingredients'))}
            aria-label="Ingredients"
            aria-pressed={panel === 'ingredients'}
          >
            <Icon name="list" size={19} />
          </button>
          <button
            type="button"
            className="cbtn h-11 w-11"
            onClick={() => setPanel(p => (p === 'settings' ? null : 'settings'))}
            aria-label="Voice settings"
            aria-pressed={panel === 'settings'}
          >
            <Icon name="sliders" size={19} />
          </button>
        </div>
      </div>

      <div className="gutter">
        <div className="wrap flex gap-1.5 pb-2" role="group" aria-label="Steps">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === idx ? 'step' : undefined}
              className="flex-1 py-2"
            >
              <span
                className="block h-1.5 rounded-full transition"
                style={{ background: i < idx ? 'var(--cook-accent)' : i === idx ? 'var(--cook-ink)' : 'var(--cook-line)' }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="gutter min-h-0 flex-1 overflow-y-auto">
        <div className="wrap grid gap-6 pt-3 pb-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-6">
          <div className="min-w-0">
            {step !== null ? (
              <div key={idx} className="rise">
                <p className="tabular font-mono text-[13px] tracking-[0.14em] text-cook-muted uppercase">
                  Step {idx + 1} of {n}
                  {speaking ? ' · reading aloud' : ''}
                </p>
                <p className="mt-4 max-w-[30ch] text-[clamp(26px,4.4vw,48px)] leading-[1.22] font-semibold tracking-[-0.01em]" aria-live="polite">
                  {step}
                </p>

                {durations[idx].length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {durations[idx].map((d, k) => {
                      const t = stepTimer(k);
                      if (t) {
                        return (
                          <span
                            key={k}
                            className={`tabular inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[18px] font-medium ${t.done ? 'pulse-done' : ''}`}
                            style={{
                              background: t.done ? 'var(--cook-alarm)' : 'var(--cook-ink)',
                              color: t.done ? '#2A0A04' : 'var(--cook-bg)',
                            }}
                          >
                            <Icon name="timer" size={18} />
                            {t.done ? "Time's up" : formatClock(remainingMs(t, now))}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={k}
                          type="button"
                          className="cbtn-primary tabular px-4 py-2.5 font-mono text-[16px]"
                          onClick={() => {
                            primeAudio();
                            startStepTimer(idx, k, false);
                          }}
                        >
                          <Icon name="timer" size={18} />
                          Start {formatClock(d.secs * 1000)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {here.length > 0 && (
                  <div className="mt-7">
                    <p className="font-mono text-[12px] tracking-[0.12em] text-cook-muted uppercase">For this step</p>
                    <ul className="mt-2.5 flex flex-wrap gap-2">
                      {here.map(x => (
                        <li key={x.index} className="rounded-full border border-cook-line bg-cook-chip px-3.5 py-1.5 text-[15px]">
                          {lines[x.index]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {countdown !== null && (
                  <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-cook-line bg-cook-chip py-1.5 pr-1.5 pl-4">
                    <span className="tabular font-mono text-[14px]">Next step in {countdown}s</span>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-[13px] font-semibold hover:bg-cook-chip"
                      onClick={() => {
                        runRef.current++;
                        clearCountdown();
                      }}
                    >
                      Stay here
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rise py-6">
                <p className="font-mono text-[13px] tracking-[0.14em] text-cook-muted uppercase">All {n} steps done</p>
                <p className="mt-3 font-display text-[clamp(44px,8vw,84px)] leading-none">Bon appétit.</p>
                <p className="mt-4 max-w-[46ch] text-[18px] text-cook-muted">
                  How did it turn out? A quick rating helps the next cook decide.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="cbtn-primary px-6 py-3.5 text-[17px]"
                    onClick={() => {
                      navigate(`/recipes/${r.id}`);
                      window.setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 80);
                    }}
                  >
                    <Icon name="check" size={19} />
                    Rate this recipe
                  </button>
                  <button type="button" className="cbtn px-5 py-3.5 text-[16px]" onClick={() => go(0)}>
                    Start over
                  </button>
                  <button type="button" className="cbtn px-5 py-3.5 text-[16px]" onClick={exit}>
                    Back to the recipe
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="cpanel p-4" aria-label="Voice commands">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Voice commands</p>
                <button
                  type="button"
                  className="cbtn h-10 px-3.5 text-[14px]"
                  aria-pressed={listening}
                  onClick={toggleListening}
                  disabled={!mic.ok}
                >
                  <Icon name={mic.ok ? 'mic' : 'micOff'} size={16} />
                  {listening ? 'Listening' : 'Listen'}
                </button>
              </div>
              {mic.ok ? (
                <div className="mt-3 min-h-[44px] rounded-xl bg-black/15 px-3 py-2.5 text-[14.5px]" aria-live="polite">
                  {listening ? (
                    <span className="flex items-center gap-2">
                      <span className="listen-dot h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--cook-alarm)' }} />
                      {interim ? (
                        <span className="italic">{interim}</span>
                      ) : heard ? (
                        <span className="text-cook-muted">
                          Heard “{heard.text}”{heard.understood ? '' : ", which isn't a command"}
                        </span>
                      ) : (
                        <span className="text-cook-muted">Say a command, like “next”.</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-cook-muted">Tap Listen and talk with your hands full.</span>
                  )}
                </div>
              ) : (
                <p className="mt-2.5 text-[14px] leading-relaxed text-cook-muted">
                  {mic.reason} Spoken steps, autoplay and timers still work, and so do the keys below.
                </p>
              )}
              <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-[13.5px]">
                {COMMAND_HELP.filter(c => mic.ok || c.key).map(c => (
                  <Fragment key={c.phrase}>
                    <dt className="truncate font-mono" title={c.does}>
                      {mic.ok ? `“${c.phrase}”` : c.does}
                    </dt>
                    <dd className="text-right font-mono text-cook-muted">{c.key}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>

            {myTimers.length > 0 && (
              <section className="flex flex-col gap-2" aria-label="Timers">
                {myTimers.map(t => (
                  <TimerRow key={t.id} timer={t} dark />
                ))}
              </section>
            )}

            {step !== null && idx + 1 < n && (
              <section className="cpanel p-4">
                <p className="font-mono text-[12px] tracking-[0.12em] text-cook-muted uppercase">Up next · Step {idx + 2}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed">{steps[idx + 1]}</p>
              </section>
            )}
          </aside>
        </div>
      </div>

      <div className="gutter border-t border-cook-line">
        <div className="wrap flex items-center gap-3 pt-3">
          <button type="button" className="cbtn h-16 w-16 shrink-0" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous step">
            <Icon name="skipBack" size={22} />
          </button>
          <button
            type="button"
            className="cbtn h-16 w-16 shrink-0"
            onClick={() => {
              if (idx < n) void runStep(idx);
            }}
            aria-label="Read this step again"
            aria-pressed={speaking}
          >
            <Icon name="volume" size={23} />
          </button>
          <button type="button" className="cbtn-primary h-16 min-w-0 flex-1 px-5 text-[18px]" onClick={() => (idx < n ? go(idx + 1) : exit())}>
            <span className="truncate">{idx < n - 1 ? 'Next step' : idx === n - 1 ? 'Finish' : 'Done'}</span>
            <Icon name="arrowRight" size={21} />
          </button>
        </div>
      </div>

      {panel === 'ingredients' && (
        <div
          className="absolute inset-0 z-10 flex justify-end bg-black/40"
          onClick={e => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          <div className="speckle flex h-full w-full max-w-md flex-col border-l border-cook-line shadow-lift" style={drawerStyle}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-[24px]">Ingredients</p>
              <div className="flex gap-2">
                <button type="button" className="cbtn h-10 px-3.5 text-[14px]" onClick={() => void tts.speak(`You need: ${lines.join('. ')}`, voice())}>
                  <Icon name="volume" size={16} />
                  Read all
                </button>
                <button type="button" className="cbtn h-10 w-10" onClick={() => setPanel(null)} aria-label="Close ingredients">
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>
            <p className="tabular mt-1 font-mono text-[12px] text-cook-muted">
              For {servings} serving{servings === 1 ? '' : 's'}
            </p>
            <ul className="mt-3 flex-1 divide-y divide-cook-line overflow-y-auto">
              {lines.map((l, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() =>
                        setChecked(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="mt-1 h-[18px] w-[18px] shrink-0"
                      style={{ accentColor: 'var(--cook-accent)' }}
                    />
                    <span className={`text-[17px] ${checked.has(i) ? 'line-through opacity-60' : ''}`}>{l}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {panel === 'settings' && (
        <div
          className="absolute inset-0 z-10 flex justify-end bg-black/40"
          onClick={e => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          <div className="speckle flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-cook-line shadow-lift" style={drawerStyle}>
            <div className="flex items-center justify-between">
              <p className="font-display text-[24px]">Voice settings</p>
              <button type="button" className="cbtn h-10 w-10" onClick={() => setPanel(null)} aria-label="Close settings">
                <Icon name="x" size={18} />
              </button>
            </div>
            {!tts.supported && (
              <p className="rounded-xl bg-black/20 p-3 text-[14px]">
                This browser can't speak, so steps won't be read aloud. Timers and keys still work.
              </p>
            )}
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">Read steps aloud</span>
                <span className="text-[13.5px] text-cook-muted">Each step is spoken when it appears.</span>
              </span>
              <input
                type="checkbox"
                checked={prefs.speak}
                onChange={e => setPrefs(p => ({ ...p, speak: e.target.checked }))}
                className="h-6 w-6"
                style={{ accentColor: 'var(--cook-accent)' }}
              />
            </label>
            <div>
              <label htmlFor="cook-voice" className="font-semibold">
                Voice
              </label>
              <select
                id="cook-voice"
                className="cook-field mt-1.5"
                value={prefs.voiceURI}
                onChange={e => setPrefs(p => ({ ...p, voiceURI: e.target.value }))}
              >
                <option value="">Browser default</option>
                {voices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cook-rate" className="flex justify-between font-semibold">
                <span>Speaking speed</span>
                <span className="tabular font-mono text-cook-muted">{prefs.rate.toFixed(2)}×</span>
              </label>
              <input
                id="cook-rate"
                type="range"
                min={0.7}
                max={1.4}
                step={0.05}
                value={prefs.rate}
                onChange={e => setPrefs(p => ({ ...p, rate: Number(e.target.value) }))}
                className="mt-2 w-full"
              />
            </div>
            <button
              type="button"
              className="cbtn h-11 w-fit px-4 text-[14px]"
              onClick={() => {
                const s = Math.min(idx, n - 1);
                void say(`Step ${s + 1}. ${steps[s]}`);
              }}
            >
              <Icon name="volume" size={16} />
              Test this voice
            </button>
            <div className="border-t border-cook-line pt-5">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">Autoplay</span>
                  <span className="text-[13.5px] text-cook-muted">
                    Reads a step, starts its timer, and moves on when the timer rings.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.autoplay}
                  onChange={toggleAutoplay}
                  className="h-6 w-6"
                  style={{ accentColor: 'var(--cook-accent)' }}
                />
              </label>
              <label htmlFor="cook-pause" className="mt-4 block font-semibold">
                Steps without a timer move on after
              </label>
              <select
                id="cook-pause"
                className="cook-field mt-1.5"
                value={prefs.pause}
                onChange={e => setPrefs(p => ({ ...p, pause: Number(e.target.value) }))}
              >
                {PAUSE_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
