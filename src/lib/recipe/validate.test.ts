import { describe, expect, it } from 'vitest';
import { LIMITS, normaliseRating, normaliseRecipeInput, validateRecipeInput } from './validate';

describe('normaliseRecipeInput', () => {
  it('fills defaults for missing or malformed data', () => {
    const r = normaliseRecipeInput({ title: '  Dal  ', cuisine: 'Atlantis', difficulty: 'Impossible', diet: ['Vegan', 'Keto'] });
    expect(r.title).toBe('Dal');
    expect(r.cuisine).toBe('Other');
    expect(r.difficulty).toBe('Easy');
    expect(r.diet).toEqual(['Vegan']);
    expect(r.servings).toBe(2);
    expect(r.plate).toBe('');
  });

  it('clamps numbers and trims lists', () => {
    const r = normaliseRecipeInput({
      prepMinutes: -5,
      cookMinutes: '30',
      servings: 500,
      ingredients: ['  1 cup rice ', '', 42, 'x'.repeat(1000)],
      steps: Array.from({ length: 100 }, (_, i) => `Step ${i}`),
      plate: 'curry',
    });
    expect(r.prepMinutes).toBe(0);
    expect(r.cookMinutes).toBe(30);
    expect(r.servings).toBe(LIMITS.servings);
    expect(r.ingredients).toHaveLength(2);
    expect(r.ingredients[0]).toBe('1 cup rice');
    expect(r.ingredients[1]).toHaveLength(LIMITS.line);
    expect(r.steps).toHaveLength(LIMITS.steps);
    expect(r.plate).toBe('curry');
  });

  it('handles non-objects', () => {
    expect(normaliseRecipeInput(null).title).toBe('');
    expect(normaliseRecipeInput('nope').steps).toEqual([]);
  });
});

describe('validateRecipeInput', () => {
  it('requires a title, ingredients and steps', () => {
    const errors = validateRecipeInput(normaliseRecipeInput({}));
    expect(Object.keys(errors).sort()).toEqual(['ingredients', 'steps', 'title']);
    const ok = validateRecipeInput(normaliseRecipeInput({ title: 'Tea', ingredients: ['1 tea bag'], steps: ['Brew.'] }));
    expect(ok).toEqual({});
  });
});

describe('normaliseRating', () => {
  it('clamps to whole stars between 0 and 5', () => {
    expect(normaliseRating(4.6)).toBe(5);
    expect(normaliseRating(9)).toBe(5);
    expect(normaliseRating(-1)).toBe(0);
    expect(normaliseRating('3')).toBe(3);
    expect(normaliseRating(undefined)).toBe(0);
  });
});
