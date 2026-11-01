import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

/** useState that remembers its value in localStorage between visits. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stored = readJSON<T | null>(key, null);
    if (stored === null) return initial;
    // Merge objects so new settings get their defaults after an upgrade.
    if (typeof initial === 'object' && initial !== null && !Array.isArray(initial) && typeof stored === 'object') {
      return { ...initial, ...stored };
    }
    return stored;
  });
  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);
  return [value, setValue];
}
