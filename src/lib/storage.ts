/** localStorage that never throws: private windows and blocked storage just fall back to defaults. */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T, store: KeyValueStore | null = browserStore()): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app keeps working for this visit.
  }
}

export function removeKey(key: string, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: key => void map.delete(key),
  };
}

export { browserStore };
