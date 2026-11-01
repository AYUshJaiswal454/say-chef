import { STARTER_RECIPES } from '../../data/starterRecipes';
import { LIMITS, normaliseRating, normaliseRecipeInput } from '../recipe/validate';
import { readJSON, writeJSON, type KeyValueStore } from '../storage';
import type { CookUser, DataSource, Recipe, RecipeInput, Review, ReviewInput, Unsubscribe } from './types';

/**
 * Demo mode: everything lives in this browser's localStorage, so Say Chef runs with
 * `npm run dev` and no Firebase project. Open the app in two tabs and changes sync
 * between them through the storage event.
 */

export const DEMO_USER: CookUser = { uid: 'demo-cook', name: 'You', photoURL: null };
export const STARTER_AUTHOR = { id: 'say-chef', name: 'Say Chef' };

const KEY = 'saychef.demo.v1';

interface DemoState {
  recipes: Record<string, Recipe>;
  /** recipeId -> authorId -> review */
  reviews: Record<string, Record<string, Review>>;
  favorites: string[];
}

function starterState(now: number): DemoState {
  const recipes: Record<string, Recipe> = {};
  STARTER_RECIPES.forEach((s, i) => {
    const { id, ...input } = s;
    // Space creation dates a day apart so "Newest" has a stable order.
    const at = now - (STARTER_RECIPES.length - i) * 86_400_000;
    recipes[id] = {
      ...normaliseRecipeInput(input),
      id,
      authorId: STARTER_AUTHOR.id,
      authorName: STARTER_AUTHOR.name,
      authorPhoto: null,
      createdAt: at,
      updatedAt: at,
      ratingCount: 0,
      ratingSum: 0,
      starter: true,
    };
  });
  return { recipes, reviews: {}, favorites: [] };
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createLocalSource(store: KeyValueStore | null, now: () => number = Date.now): DataSource {
  let state = readJSON<DemoState | null>(KEY, null, store);
  if (!state || typeof state !== 'object' || !state.recipes) {
    state = starterState(now());
    writeJSON(KEY, state, store);
  }

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(fn => fn());
  const commit = (next: DemoState) => {
    state = next;
    writeJSON(KEY, state, store);
    emit();
  };
  const listen = (fn: () => void): Unsubscribe => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', e => {
      if (e.key !== KEY) return;
      state = readJSON<DemoState>(KEY, state as DemoState, store);
      emit();
    });
  }

  const current = () => state as DemoState;

  const recalc = (s: DemoState, recipeId: string): DemoState => {
    const recipe = s.recipes[recipeId];
    if (!recipe) return s;
    const list = Object.values(s.reviews[recipeId] ?? {});
    return {
      ...s,
      recipes: {
        ...s.recipes,
        [recipeId]: { ...recipe, ratingCount: list.length, ratingSum: list.reduce((a, r) => a + r.rating, 0) },
      },
    };
  };

  const makeRecipe = (user: CookUser, input: RecipeInput, starter: boolean): Recipe => {
    const at = now();
    return {
      ...normaliseRecipeInput(input),
      id: newId(),
      authorId: user.uid,
      authorName: user.name,
      authorPhoto: user.photoURL,
      createdAt: at,
      updatedAt: at,
      ratingCount: 0,
      ratingSum: 0,
      starter,
    };
  };

  return {
    mode: 'demo',

    onAuthChange(next) {
      queueMicrotask(() => next(DEMO_USER));
      return () => {};
    },
    async signIn() {},
    async signOut() {},

    watchRecipes(next) {
      const push = () => next(Object.values(current().recipes).sort((a, b) => b.createdAt - a.createdAt));
      queueMicrotask(push);
      return listen(push);
    },

    async createRecipe(user, input, options) {
      const recipe = makeRecipe(user, input, !!options?.starter);
      commit({ ...current(), recipes: { ...current().recipes, [recipe.id]: recipe } });
      return recipe.id;
    },

    async createRecipes(user, inputs, options) {
      const recipes = { ...current().recipes };
      for (const input of inputs) {
        const recipe = makeRecipe(user, input, !!options?.starter);
        recipes[recipe.id] = recipe;
      }
      commit({ ...current(), recipes });
    },

    async updateRecipe(user, id, input) {
      const existing = current().recipes[id];
      if (!existing) throw new Error('That recipe no longer exists.');
      if (existing.authorId !== user.uid) throw new Error('Only the author can edit this recipe.');
      commit({
        ...current(),
        recipes: {
          ...current().recipes,
          [id]: { ...existing, ...normaliseRecipeInput(input), authorName: user.name, updatedAt: now() },
        },
      });
    },

    async deleteRecipe(id) {
      const { [id]: _removed, ...recipes } = current().recipes;
      const { [id]: _reviews, ...reviews } = current().reviews;
      commit({ ...current(), recipes, reviews, favorites: current().favorites.filter(f => f !== id) });
    },

    watchReviews(recipeId, next) {
      const push = () =>
        next(Object.values(current().reviews[recipeId] ?? {}).sort((a, b) => b.updatedAt - a.updatedAt));
      queueMicrotask(push);
      return listen(push);
    },

    async saveReview(user, recipeId, review: ReviewInput) {
      const recipe = current().recipes[recipeId];
      if (!recipe) throw new Error('That recipe no longer exists.');
      if (recipe.authorId === user.uid) throw new Error("You can't review your own recipe.");
      const rating = normaliseRating(review.rating);
      if (rating < 1) throw new Error('Pick a star rating from 1 to 5.');
      const prev = current().reviews[recipeId]?.[user.uid];
      const at = now();
      const saved: Review = {
        authorId: user.uid,
        authorName: user.name,
        authorPhoto: user.photoURL,
        rating,
        text: review.text.trim().slice(0, LIMITS.reviewText),
        createdAt: prev?.createdAt ?? at,
        updatedAt: at,
      };
      const reviews = {
        ...current().reviews,
        [recipeId]: { ...(current().reviews[recipeId] ?? {}), [user.uid]: saved },
      };
      commit(recalc({ ...current(), reviews }, recipeId));
    },

    async deleteReview(user, recipeId) {
      const { [user.uid]: _removed, ...rest } = current().reviews[recipeId] ?? {};
      commit(recalc({ ...current(), reviews: { ...current().reviews, [recipeId]: rest } }, recipeId));
    },

    watchFavorites(_uid, next) {
      const push = () => next([...current().favorites]);
      queueMicrotask(push);
      return listen(push);
    },

    async setFavorite(_uid, recipeId, saved) {
      const set = new Set(current().favorites);
      if (saved) set.add(recipeId);
      else set.delete(recipeId);
      commit({ ...current(), favorites: [...set] });
    },
  };
}

/** Clears demo data so the starter recipes load fresh on the next visit. */
export function resetDemoData(store: KeyValueStore | null): void {
  writeJSON(KEY, starterState(Date.now()), store);
}
