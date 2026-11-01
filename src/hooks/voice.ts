import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { micStatus, onMicStatusChange } from '../lib/voice/recognition';
import { getVoices, tts } from '../lib/voice/speech';

/** Whether speech recognition can be used right now, and why not. */
export function useMic(): { ok: boolean; reason: string } {
  const key = useSyncExternalStore(onMicStatusChange, () => {
    const s = micStatus();
    return `${s.ok}|${s.reason}`;
  });
  return useMemo(() => {
    const [ok, reason] = key.split('|');
    return { ok: ok === 'true', reason };
  }, [key]);
}

/** True while text-to-speech is talking. */
export function useSpeaking(): boolean {
  return useSyncExternalStore(
    tts.subscribe,
    () => tts.speaking,
    () => false,
  );
}

/** Installed voices, English first; voices load asynchronously in most browsers. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getVoices());
  useEffect(() => {
    if (!tts.supported) return;
    const update = () => setVoices(getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    const timer = window.setTimeout(update, 400);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener('voiceschanged', update);
    };
  }, []);
  return useMemo(() => {
    const english = voices.filter(v => /^en/i.test(v.lang));
    return (english.length ? english : voices)
      .slice()
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  }, [voices]);
}

/** Keeps the screen awake while cooking, where the browser allows it. */
export function useWakeLock(active: boolean): boolean {
  const [awake, setAwake] = useState(false);
  useEffect(() => {
    if (!active) return;
    type Sentinel = { release(): Promise<void>; addEventListener(type: 'release', fn: () => void): void };
    const wakeLock = (navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }).wakeLock;
    if (!wakeLock) return;
    let sentinel: Sentinel | null = null;
    let alive = true;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const s = await wakeLock.request('screen');
        if (!alive) {
          void s.release();
          return;
        }
        sentinel = s;
        setAwake(true);
        s.addEventListener('release', () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    void request();
    const onVisible = () => {
      if (alive) void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [active]);
  return awake;
}
