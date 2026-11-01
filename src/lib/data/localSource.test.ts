import { describe, expect, it } from 'vitest';
import { STARTER_RECIPES } from '../../data/starterRecipes';
import { memoryStore } from '../storage';
import { DEMO_USER, createLocalSource } from './localSource';
import type { Recipe, Review } from './types';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

async function latestRecipes(source: ReturnType<typeof createLocalSource>): Promise<Recipe[]> {
  let out: Recipe[] = [];
  const stop = source.watchRecipes(r => (out = r), () => {});
  await flush();
  stop();
  return out;
}

describe('local demo source', () => {
  it('starts with the starter recipes', async () => {
    const source = createLocalSource(memoryStore());
    const recipes = await latestRecipes(source);
    expect(recipes).toHaveLength(STARTER_RECIPES.length);
    expect(recipes.every(r => r.starter)).toBe(true);
  });

  it('creates, updates and deletes a recipe', async () => {
    const store = memoryStore();
    const source = createLocalSource(store);
    const input = { ...STARTER_RECIPES[0], title: 'Jeera Rice' };
    const id = await source.createRecipe(DEMO_USER, input);
    let recipes = await latestRecipes(source);
    expect(recipes[0]).toMatchObject({ id, title: 'Jeera Rice', authorId: DEMO_USER.uid, starter: false });

    await source.updateRecipe(DEMO_USER, id, { ...input, title: 'Cumin Rice' });
    recipes = await latestRecipes(source);
    expect(recipes.find(r => r.id === id)?.title).toBe('Cumin Rice');

    // A fresh source on the same storage sees the saved data.
    expect((await latestRecipes(createLocalSource(store))).some(r => r.id === id)).toBe(true);

    await source.deleteRecipe(id);
    expect((await latestRecipes(source)).some(r => r.id === id)).toBe(false);
  });

  it('only lets the author edit', async () => {
    const source = createLocalSource(memoryStore());
    const starter = (await latestRecipes(source))[0];
    await expect(source.updateRecipe(DEMO_USER, starter.id, starter)).rejects.toThrow('Only the author');
  });

  it('keeps one review per cook and updates the rating totals', async () => {
    const source = createLocalSource(memoryStore());
    const target = (await latestRecipes(source))[0];
    await source.saveReview(DEMO_USER, target.id, { rating: 4, text: 'Lovely' });
    await source.saveReview(DEMO_USER, target.id, { rating: 2, text: 'Second try' });

    let reviews: Review[] = [];
    const stop = source.watchReviews(target.id, r => (reviews = r), () => {});
    await flush();
    stop();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ rating: 2, text: 'Second try' });

    let updated = (await latestRecipes(source)).find(r => r.id === target.id);
    expect(updated).toMatchObject({ ratingCount: 1, ratingSum: 2 });

    await source.deleteReview(DEMO_USER, target.id);
    updated = (await latestRecipes(source)).find(r => r.id === target.id);
    expect(updated).toMatchObject({ ratingCount: 0, ratingSum: 0 });
  });

  it("refuses reviews of the cook's own recipe and empty ratings", async () => {
    const source = createLocalSource(memoryStore());
    const id = await source.createRecipe(DEMO_USER, STARTER_RECIPES[1]);
    await expect(source.saveReview(DEMO_USER, id, { rating: 5, text: '' })).rejects.toThrow('own recipe');
    const starter = (await latestRecipes(source)).find(r => r.starter) as Recipe;
    await expect(source.saveReview(DEMO_USER, starter.id, { rating: 0, text: '' })).rejects.toThrow('star rating');
  });

  it('saves favourites', async () => {
    const source = createLocalSource(memoryStore());
    await source.setFavorite(DEMO_USER.uid, 'dal-tadka', true);
    await source.setFavorite(DEMO_USER.uid, 'masala-chai', true);
    await source.setFavorite(DEMO_USER.uid, 'dal-tadka', false);
    let ids: string[] = [];
    const stop = source.watchFavorites(DEMO_USER.uid, f => (ids = f));
    await flush();
    stop();
    expect(ids).toEqual(['masala-chai']);
  });
});
