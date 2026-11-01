import { parseNumber } from './quantities';

/**
 * Finds cooking times written in a step ("simmer for 10 minutes", "rest 1-2 hours",
 * "bake for 1½ hours", "half an hour") so the UI can offer a one-tap timer for each one.
 */

export interface Duration {
  /** Length in seconds. Ranges use the upper bound ("8-10 minutes" is 600). */
  secs: number;
  /** The exact words matched, e.g. "10 minutes". */
  phrase: string;
}

export const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  'forty-five': 45,
  forty: 40,
  fifty: 50,
  sixty: 60,
  ninety: 90,
};

const NUMBER_WORD_ALTERNATION = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join('|');

const NUM = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾]|\d+(?:\.\d+)?`;
const AMOUNT = String.raw`(?:${NUM})(?:\s*(?:-|–|to)\s*(?:${NUM}))?`;
const UNIT = String.raw`hours?|hrs?|minutes?|mins?|seconds?|secs?`;

const DURATION_RE = new RegExp(
  String.raw`(?<![\w/.])(${AMOUNT}|(?:${NUMBER_WORD_ALTERNATION}))\s*(${UNIT})\b|\b(half an? hour)\b`,
  'gi',
);

const MIN_SECONDS = 5;
const MAX_SECONDS = 6 * 3600;

export function parseDurations(text: string): Duration[] {
  const found: Duration[] = [];
  for (const match of text.matchAll(DURATION_RE)) {
    if (match[3]) {
      found.push({ secs: 1800, phrase: match[0] });
      continue;
    }
    const raw = match[1].toLowerCase();
    let amount: number;
    if (NUMBER_WORDS[raw] !== undefined) {
      amount = NUMBER_WORDS[raw];
    } else {
      const parts = raw.split(/\s*(?:-|–|to)\s*/);
      amount = parseNumber(parts[parts.length - 1]);
    }
    if (!Number.isFinite(amount)) continue;
    const unit = match[2].toLowerCase()[0];
    const secs = Math.round(amount * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1));
    if (secs >= MIN_SECONDS && secs <= MAX_SECONDS) found.push({ secs, phrase: match[0] });
  }
  return found;
}

/** "1 hr 30 min", "45 sec" */
export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs} sec`;
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s ? `${m} min ${s} sec` : `${m} min`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** "1 hour 30 minutes", for speech. */
export function speakDuration(secs: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (secs < 60) return plural(secs, 'second');
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s ? `${plural(m, 'minute')} ${plural(s, 'second')}` : plural(m, 'minute');
  }
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return m ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
}

/** Countdown display: "4:05" or "1:02:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "1 hr 5 min" for recipe totals given in minutes. */
export function formatMinutes(min: number): string {
  if (!min) return '0 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
