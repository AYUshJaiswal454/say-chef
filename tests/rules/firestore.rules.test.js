import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-say-chef',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const fields = {
  title: 'Dal Tadka',
  description: 'Yellow lentils with a ghee tempering.',
  cuisine: 'Indian',
  difficulty: 'Easy',
  prepMinutes: 10,
  cookMinutes: 35,
  servings: 4,
  diet: ['Vegetarian'],
  ingredients: ['1 cup toor dal', '3 cups water'],
  steps: ['Cook the dal for 12 minutes.', 'Temper with ghee.'],
  notes: '',
  plate: 'curry',
};

const newRecipe = (authorId, extra = {}) => ({
  ...fields,
  authorId,
  authorName: authorId,
  authorPhoto: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ratingCount: 0,
  ratingSum: 0,
  starter: false,
  ...extra,
});

/** Writes a recipe owned by `authorId` with rules switched off. */
async function seedRecipe(id, authorId, extra = {}) {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'recipes', id), {
      ...newRecipe(authorId),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...extra,
    });
  });
}

/** The same transaction the app runs in firestoreSource.saveReview. */
function review(db, uid, recipeId, rating, { sumDelta, countDelta } = {}) {
  return runTransaction(db, async tx => {
    const reviewRef = doc(db, 'recipes', recipeId, 'reviews', uid);
    const existing = await tx.get(reviewRef);
    const previous = existing.exists() ? existing.data().rating : 0;
    tx.set(reviewRef, {
      authorId: uid,
      authorName: uid,
      authorPhoto: null,
      rating,
      text: 'Tasty',
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(doc(db, 'recipes', recipeId), {
      ratingSum: increment(sumDelta ?? rating - previous),
      ratingCount: increment(countDelta ?? (previous ? 0 : 1)),
    });
  });
}

describe('recipes', () => {
  it('are readable by anyone', async () => {
    await seedRecipe('r1', 'alice');
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'recipes/r1')));
  });

  it('can be created by a signed-in cook as themselves', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'recipes/new'), newRecipe('alice')));
  });

  it('cannot be created signed out, for someone else, or with ratings', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'recipes/a'), newRecipe('alice')));
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'recipes/b'), newRecipe('bob')));
    await assertFails(setDoc(doc(db, 'recipes/c'), newRecipe('alice', { ratingCount: 3, ratingSum: 15 })));
  });

  it('are validated', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'recipes/a'), newRecipe('alice', { title: '' })));
    await assertFails(setDoc(doc(db, 'recipes/b'), newRecipe('alice', { title: 'x'.repeat(121) })));
    await assertFails(setDoc(doc(db, 'recipes/c'), newRecipe('alice', { steps: [] })));
    await assertFails(setDoc(doc(db, 'recipes/d'), newRecipe('alice', { difficulty: 'Extreme' })));
    await assertFails(setDoc(doc(db, 'recipes/e'), newRecipe('alice', { servings: 0 })));
    await assertFails(setDoc(doc(db, 'recipes/f'), newRecipe('alice', { isAdmin: true })));
  });

  it('can be edited and deleted only by the author', async () => {
    await seedRecipe('r1', 'alice');
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(updateDoc(doc(alice, 'recipes/r1'), { title: 'Better Dal', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(bob, 'recipes/r1'), { title: 'Bob Dal', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(bob, 'recipes/r1')));
    await assertSucceeds(deleteDoc(doc(alice, 'recipes/r1')));
  });

  it('never let the author change authorship or ratings', async () => {
    await seedRecipe('r1', 'alice');
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(alice, 'recipes/r1'), { authorId: 'bob', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice, 'recipes/r1'), { ratingSum: 50, ratingCount: 10 }));
  });
});

describe('reviews', () => {
  it('update the rating totals in the same transaction', async () => {
    await seedRecipe('r1', 'alice');
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(review(bob, 'bob', 'r1', 4));
    await assertSucceeds(review(bob, 'bob', 'r1', 2));
    const snap = await getDoc(doc(bob, 'recipes/r1'));
    if (snap.data().ratingSum !== 2 || snap.data().ratingCount !== 1) throw new Error('totals out of step');
  });

  it('cannot be written without matching totals', async () => {
    await seedRecipe('r1', 'alice');
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(review(bob, 'bob', 'r1', 3, { sumDelta: 5 }));
    await assertFails(review(bob, 'bob', 'r1', 3, { countDelta: 2 }));
    await assertFails(
      setDoc(doc(bob, 'recipes/r1/reviews/bob'), {
        authorId: 'bob',
        authorName: 'bob',
        authorPhoto: null,
        rating: 5,
        text: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('cannot be written for someone else, for your own recipe, or out of range', async () => {
    await seedRecipe('r1', 'alice');
    const bob = env.authenticatedContext('bob').firestore();
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(review(bob, 'carol', 'r1', 4));
    await assertFails(review(alice, 'alice', 'r1', 5));
    await assertFails(review(bob, 'bob', 'r1', 6));
    await assertFails(review(bob, 'bob', 'r1', 0));
  });

  it('can be deleted by their author with the totals reduced', async () => {
    await seedRecipe('r1', 'alice');
    const bob = env.authenticatedContext('bob').firestore();
    await review(bob, 'bob', 'r1', 4);
    await assertSucceeds(
      runTransaction(bob, async tx => {
        tx.delete(doc(bob, 'recipes/r1/reviews/bob'));
        tx.update(doc(bob, 'recipes/r1'), { ratingSum: increment(-4), ratingCount: increment(-1) });
      }),
    );
  });

  it('cannot be deleted by someone else', async () => {
    await seedRecipe('r1', 'alice');
    const bob = env.authenticatedContext('bob').firestore();
    await review(bob, 'bob', 'r1', 4);
    const carol = env.authenticatedContext('carol').firestore();
    await assertFails(deleteDoc(doc(carol, 'recipes/r1/reviews/bob')));
  });
});

describe('favorites', () => {
  it('are private to their owner', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice/favorites/r1'), { savedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(bob, 'users/alice/favorites/r1')));
    await assertFails(setDoc(doc(bob, 'users/alice/favorites/r2'), { savedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/favorites/r1')));
  });
});
