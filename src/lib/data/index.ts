import { browserStore } from '../storage';
import { isFirebaseConfigured } from './firebaseConfig';
import { createLocalSource } from './localSource';
import type { DataSource } from './types';

let pending: Promise<DataSource> | null = null;

/**
 * Picks the data source once per page load. Firebase is loaded lazily, so demo mode
 * never downloads the Firebase SDK.
 */
export function getDataSource(): Promise<DataSource> {
  if (!pending) {
    pending = isFirebaseConfigured
      ? import('./firestoreSource').then(m => m.createFirestoreSource())
      : Promise.resolve(createLocalSource(browserStore()));
  }
  return pending;
}

export type { CookUser, DataSource, Recipe, RecipeInput, Review, ReviewInput } from './types';
export { averageRating, totalMinutes } from './types';
