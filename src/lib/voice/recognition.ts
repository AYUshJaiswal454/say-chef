/**
 * A small wrapper around the Web Speech API's SpeechRecognition (webkitSpeechRecognition
 * in Chrome and Safari). TypeScript's DOM library doesn't ship these types, so the
 * minimal shape we use is declared here.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function findConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const Ctor = findConstructor();

/** False once the browser or the user refuses the microphone for this visit. */
let micAllowed = true;
const micListeners = new Set<() => void>();

export const recognitionSupported = Ctor !== null;

export function micStatus(): { ok: boolean; reason: string } {
  if (!Ctor) {
    return { ok: false, reason: "This browser can't recognise speech. Chrome, Edge and Safari can." };
  }
  if (!micAllowed) {
    return { ok: false, reason: 'Microphone access is blocked, so voice commands are off.' };
  }
  return { ok: true, reason: '' };
}

export function onMicStatusChange(fn: () => void): () => void {
  micListeners.add(fn);
  return () => micListeners.delete(fn);
}

function blockMic() {
  micAllowed = false;
  micListeners.forEach(fn => fn());
}

export interface ListenerOptions {
  /** Keep listening until stop() (cooking mode), or stop after one phrase (dictation). */
  continuous: boolean;
  onText: (finalText: string) => void;
  onInterim?: (partialText: string) => void;
  onStateChange?: (listening: boolean) => void;
  onError?: (code: string) => void;
  lang?: string;
}

export interface SpeechListener {
  start(): void;
  stop(): void;
}

export function createListener(options: ListenerOptions): SpeechListener | null {
  if (!Ctor || !micAllowed) return null;
  let recognition: Recognition;
  try {
    recognition = new Ctor();
  } catch {
    return null;
  }
  recognition.continuous = options.continuous;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = options.lang ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  let wanted = false;
  let restarts = 0;

  recognition.onstart = () => {
    restarts = 0;
    options.onStateChange?.(true);
  };
  recognition.onend = () => {
    // Browsers end continuous sessions after silence; quietly start again.
    if (wanted && options.continuous && restarts < 50) {
      restarts++;
      try {
        recognition.start();
        return;
      } catch {
        // Fall through and report that listening stopped.
      }
    }
    wanted = false;
    options.onStateChange?.(false);
  };
  recognition.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
      wanted = false;
      blockMic();
      options.onError?.(e.error);
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      options.onError?.(e.error);
    }
  };
  recognition.onresult = e => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (interim) options.onInterim?.(interim);
    if (final.trim()) options.onText(final.trim());
  };

  return {
    start() {
      wanted = true;
      try {
        recognition.start();
      } catch {
        // Already started.
      }
    },
    stop() {
      wanted = false;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    },
  };
}
