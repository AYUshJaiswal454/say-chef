import { speechChunks } from '../recipe/speechText';

/**
 * Text-to-speech through the browser's speechSynthesis. One shared engine for the
 * whole app, so starting a new utterance always cancels the previous one.
 */

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
}

/** true: finished; false: failed; 'interrupted': replaced by newer speech or stopped. */
export type SpeakResult = true | false | 'interrupted';

type Listener = (speaking: boolean) => void;

const supported =
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let speaking = false;
let lastEndedAt = 0;
let token = 0;
const listeners = new Set<Listener>();

function setSpeaking(value: boolean) {
  speaking = value;
  if (!value) lastEndedAt = Date.now();
  listeners.forEach(fn => fn(value));
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!supported) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

export const tts = {
  supported,

  get speaking() {
    return speaking;
  },

  /** When the last utterance ended, used to ignore the microphone hearing our own voice. */
  get lastEndedAt() {
    return lastEndedAt;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  speak(text: string, options: SpeakOptions = {}): Promise<SpeakResult> {
    if (!supported || !text.trim()) return Promise.resolve(false);
    const mine = ++token;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Nothing was speaking.
    }
    const parts = speechChunks(text);
    return new Promise(resolve => {
      let i = 0;
      setSpeaking(true);
      const next = () => {
        if (mine !== token) return resolve('interrupted');
        if (i >= parts.length) {
          setSpeaking(false);
          return resolve(true);
        }
        const utterance = new SpeechSynthesisUtterance(parts[i++]);
        utterance.rate = options.rate ?? 1;
        const voice = options.voiceURI ? getVoices().find(v => v.voiceURI === options.voiceURI) : undefined;
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        utterance.onend = next;
        utterance.onerror = () => {
          if (mine !== token) return resolve('interrupted');
          setSpeaking(false);
          resolve(false);
        };
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setSpeaking(false);
          resolve(false);
        }
      };
      // Chrome drops an utterance queued in the same tick as cancel().
      window.setTimeout(next, 60);
    });
  },

  stop() {
    token++;
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Already quiet.
    }
    if (speaking) setSpeaking(false);
  },
};
