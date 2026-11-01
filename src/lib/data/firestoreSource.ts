import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  increment,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { LIMITS, normaliseRating, normaliseRecipeInput } from '../recipe/validate';
import { firebaseConfig } from './firebaseConfig';
import type { CookUser, DataSource, Recipe, RecipeInput, Review } from './types';

/**
 * Firebase mode. Data model (see firestore.rules for who may write what):
 *
 *   recipes/{recipeId}                    the recipe, plus ratingCount / ratingSum
 *   recipes/{recipeId}/reviews/{authorId} one review per cook per recipe
 *   users/{uid}/favorites/{recipeId}      a cook's saved recipes (private)
 *
 * Review writes run in a transaction that also updates the recipe's rating totals,
 * so recipe cards can show averages without reading every review.
 */

const MAX_RECIPES = 500;
const MAX_REVIEWS = 200;

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return (value as { toMillis(): number }).toMillis();
  }
  return typeof value === 'number' ? value : Date.now();
}

function toRecipe(id: string, data: DocumentData): Recipe {
  return {
    ...normaliseRecipeInput(data),
    id,
    authorId: String(data.authorId ?? ''),
    authorName: typeof data.authorName === 'string' ? data.authorName : '',
    authorPhoto: typeof data.authorPhoto === 'string' ? data.authorPhoto : null,
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
    ratingCount: Math.max(0, Number(data.ratingCount) || 0),
    ratingSum: Math.max(0, Number(data.ratingSum) || 0),
    starter: data.starter === true,
  };
}

function toReview(id: string, data: DocumentData): Review {
  return {
    authorId: id,
    authorName: typeof data.authorName === 'string' ? data.authorName : '',
    authorPhoto: typeof data.authorPhoto === 'string' ? data.authorPhoto : null,
    rating: normaliseRating(data.rating),
    text: typeof data.text === 'string' ? data.text.slice(0, LIMITS.reviewText) : '',
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  };
}

function toCookUser(user: User): CookUser {
  return {
    uid: user.uid,
    name: (user.displayName || user.email?.split('@')[0] || 'Home cook').slice(0, LIMITS.authorName),
    photoURL: user.photoURL,
  };
}

/** Only the fields a cook edits, so the update never touches authorship or ratings. */
function recipeFields(input: RecipeInput) {
  const r = normaliseRecipeInput(input);
  return {
    title: r.title,
    description: r.description,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    servings: r.servings,
    diet: r.diet,
    ingredients: r.ingredients,
    steps: r.steps,
    notes: r.notes,
    plate: r.plate,
  };
}

function openFirestore(app: ReturnType<typeof initializeApp>): Firestore {
  try {
    // Cache data on the device so cooking mode keeps working on flaky kitchen Wi-Fi.
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    return getFirestore(app);
  }
}

export function createFirestoreSource(): DataSource {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = openFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const newRecipeDoc = (user: CookUser, input: RecipeInput, starter: boolean) => ({
    ...recipeFields(input),
    authorId: user.uid,
    authorName: user.name,
    authorPhoto: user.photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ratingCount: 0,
    ratingSum: 0,
    starter,
  });

  return {
    mode: 'firebase',

    onAuthChange(next) {
      return onAuthStateChanged(auth, user => next(user ? toCookUser(user) : null));
    },

    async signIn() {
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
    },

    async signOut() {
      await firebaseSignOut(auth);
    },

    watchRecipes(next, error) {
      const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(MAX_RECIPES));
      return onSnapshot(
        q,
        snap => next(snap.docs.map(d => toRecipe(d.id, d.data({ serverTimestamps: 'estimate' })))),
        error,
      );
    },

    async createRecipe(user, input, options) {
      const ref = doc(collection(db, 'recipes'));
      await setDoc(ref, newRecipeDoc(user, input, !!options?.starter));
      return ref.id;
    },

    async createRecipes(user, inputs, options) {
      const batch = writeBatch(db);
      for (const input of inputs) batch.set(doc(collection(db, 'recipes')), newRecipeDoc(user, input, !!options?.starter));
      await batch.commit();
    },

    async updateRecipe(user, id, input) {
      await updateDoc(doc(db, 'recipes', id), {
        ...recipeFields(input),
        authorName: user.name,
        authorPhoto: user.photoURL,
        updatedAt: serverTimestamp(),
      });
    },

    async deleteRecipe(id) {
      await deleteDoc(doc(db, 'recipes', id));
    },

    watchReviews(recipeId, next, error) {
      const q = query(
        collection(db, 'recipes', recipeId, 'reviews'),
        orderBy('updatedAt', 'desc'),
        limit(MAX_REVIEWS),
      );
      return onSnapshot(
        q,
        snap => next(snap.docs.map(d => toReview(d.id, d.data({ serverTimestamps: 'estimate' })))),
        error,
      );
    },

    async saveReview(user, recipeId, review) {
      const rating = normaliseRating(review.rating);
      if (rating < 1) throw new Error('Pick a star rating from 1 to 5.');
      const recipeRef = doc(db, 'recipes', recipeId);
      const reviewRef = doc(db, 'recipes', recipeId, 'reviews', user.uid);
      await runTransaction(db, async tx => {
        const recipeSnap = await tx.get(recipeRef);
        if (!recipeSnap.exists()) throw new Error('That recipe no longer exists.');
        if (recipeSnap.data().authorId === user.uid) throw new Error("You can't review your own recipe.");
        const existing = await tx.get(reviewRef);
        const previous = existing.exists() ? normaliseRating(existing.data().rating) : 0;
        tx.set(reviewRef, {
          authorId: user.uid,
          authorName: user.name,
          authorPhoto: user.photoURL,
          rating,
          text: review.text.trim().slice(0, LIMITS.reviewText),
          createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.update(recipeRef, {
          ratingSum: increment(rating - previous),
          ratingCount: increment(previous ? 0 : 1),
        });
      });
    },

    async deleteReview(user, recipeId) {
      const recipeRef = doc(db, 'recipes', recipeId);
      const reviewRef = doc(db, 'recipes', recipeId, 'reviews', user.uid);
      await runTransaction(db, async tx => {
        const existing = await tx.get(reviewRef);
        if (!existing.exists()) return;
        const recipeSnap = await tx.get(recipeRef);
        tx.delete(reviewRef);
        if (recipeSnap.exists()) {
          tx.update(recipeRef, {
            ratingSum: increment(-normaliseRating(existing.data().rating)),
            ratingCount: increment(-1),
          });
        }
      });
    },

    watchFavorites(uid, next) {
      return onSnapshot(
        collection(db, 'users', uid, 'favorites'),
        snap => next(snap.docs.map(d => d.id)),
        () => next([]),
      );
    },

    async setFavorite(uid, recipeId, saved) {
      const ref = doc(db, 'users', uid, 'favorites', recipeId);
      if (saved) await setDoc(ref, { savedAt: serverTimestamp() });
      else await deleteDoc(ref);
    },
  };
}
