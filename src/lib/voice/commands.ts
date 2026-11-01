import { NUMBER_WORDS } from '../recipe/durations';

/**
 * Turns what the cook says ("next", "how much salt", "set a timer for 5 minutes")
 * into a command for cooking mode. Matching is forgiving on purpose: speech
 * recognition adds filler words and the cook is busy.
 */

export type Command =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'repeat' }
  | { type: 'goto'; step: number }
  | { type: 'startTimer' }
  | { type: 'customTimer'; secs: number }
  | { type: 'timeLeft' }
  | { type: 'dismissAlarms' }
  | { type: 'stepIngredients' }
  | { type: 'allIngredients' }
  | { type: 'howMuch'; query: string }
  | { type: 'peek' }
  | { type: 'help' }
  | { type: 'stop' }
  | { type: 'exit' };

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  last: -1,
};

function toNumber(word: string): number | undefined {
  const n = Number(word);
  if (!Number.isNaN(n)) return n;
  return NUMBER_WORDS[word] ?? ORDINALS[word];
}

function unitSeconds(unit: string): number {
  return unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1;
}

/** Normalises a transcript: lower case, no punctuation, no "hey chef" prefix. */
export function normaliseTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(hey|okay|ok|hi)?\s*(say )?chef\b\s*/, '')
    .replace(/^(please|can you|could you)\s+/, '')
    .trim();
}

export function parseCommand(transcript: string): Command | null {
  const s = normaliseTranscript(transcript);
  if (!s) return null;
  let m: RegExpMatchArray | null;

  m =
    s.match(/(?:timer|remind me) (?:for )?(\d+|[a-z-]+) (minutes?|seconds?|hours?)/) ??
    s.match(/(\d+|[a-z-]+) (minutes?|seconds?|hours?) timer/);
  if (m) {
    const n = toNumber(m[1]);
    if (n && n > 0) return { type: 'customTimer', secs: n * unitSeconds(m[2]) };
  }

  m = s.match(/\b(?:go to |jump to |skip to )?step (\d+|[a-z]+)\b/);
  if (m) {
    const n = toNumber(m[1]);
    if (n) return { type: 'goto', step: n };
  }
  if (/\b(last|final) step\b/.test(s) && !/\b(go )?back\b/.test(s)) return { type: 'goto', step: -1 };

  if (/\b(how much time|time left|how long)\b/.test(s)) return { type: 'timeLeft' };

  m = s.match(/how (?:much|many) (.+)/);
  if (m) {
    const query = m[1]
      .replace(/\b(of|the|do i need|do we need|is it|i need|should i use|in this|does it need|goes in)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query) return { type: 'howMuch', query };
  }

  if (/\b(what can i say|help|commands)\b/.test(s)) return { type: 'help' };
  if (/\b(cancel|stop|dismiss|silence|turn off)\b.*\b(timers?|alarms?)\b/.test(s)) return { type: 'dismissAlarms' };
  if (/\b(start|set|begin|run)\b.*\btimer\b|^timer$/.test(s)) return { type: 'startTimer' };
  if (/\btimers?\b/.test(s)) return { type: 'timeLeft' };
  if (/\b(all (the )?ingredients|ingredient list|everything i need|full list)\b/.test(s)) {
    return { type: 'allIngredients' };
  }
  if (/\b(ingredients?|what do i need)\b/.test(s)) return { type: 'stepIngredients' };
  if (/\b(what'?s next|what is next|coming up|after this)\b/.test(s)) return { type: 'peek' };
  if (/\b(exit|quit|(close|leave|stop|finish|end) cooking( mode)?)\b/.test(s)) return { type: 'exit' };
  if (/\b(next|continue|go on|move on|forward|done|okay next)\b/.test(s)) return { type: 'next' };
  if (/\b(back|previous|go back)\b/.test(s)) return { type: 'prev' };
  if (/\b(repeat|again|say that|pardon|what was that|read it)\b/.test(s)) return { type: 'repeat' };
  if (/\b(stop|pause|quiet|silence|hush|shh|shut up)\b/.test(s)) return { type: 'stop' };
  return null;
}

export interface CommandHelp {
  phrase: string;
  key: string;
  does: string;
}

/** Shown in cooking mode and read aloud for "help". Keys work without a microphone. */
export const COMMAND_HELP: CommandHelp[] = [
  { phrase: 'next', key: '→ or Space', does: 'Go to the next step' },
  { phrase: 'back', key: '←', does: 'Go to the previous step' },
  { phrase: 'repeat', key: 'R', does: 'Read this step again' },
  { phrase: 'start timer', key: 'T', does: "Start this step's timer" },
  { phrase: 'ingredients', key: 'I', does: 'Read what this step uses' },
  { phrase: 'how much salt', key: '', does: 'Read one ingredient amount' },
  { phrase: 'go to step 3', key: '', does: 'Jump to a step' },
  { phrase: 'set a timer for 5 minutes', key: '', does: 'Start any timer' },
  { phrase: 'time left', key: '', does: 'Read running timers' },
  { phrase: 'stop', key: 'S', does: 'Stop talking and silence alarms' },
  { phrase: 'exit', key: 'Esc', does: 'Leave cooking mode' },
];
