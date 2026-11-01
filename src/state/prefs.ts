import { createContext, useContext } from 'react';

export interface VoicePrefs {
  /** Speaking speed, 0.7 to 1.4. */
  rate: number;
  /** voiceURI of the chosen voice; empty for the browser default. */
  voiceURI: string;
  /** Read each step aloud when it appears. */
  speak: boolean;
  /** Read, run the step's timer, then move on by itself. */
  autoplay: boolean;
  /** Seconds autoplay waits on steps without a timer; 0 waits for the cook. */
  pause: number;
}

export const DEFAULT_PREFS: VoicePrefs = { rate: 1, voiceURI: '', speak: true, autoplay: false, pause: 20 };

export type Theme = 'system' | 'light' | 'dark';

export interface PrefsValue {
  prefs: VoicePrefs;
  setPrefs: (update: (p: VoicePrefs) => VoicePrefs) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const PrefsContext = createContext<PrefsValue | null>(null);

export function usePrefs(): PrefsValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error('usePrefs must be used inside <AppProviders>');
  return value;
}
