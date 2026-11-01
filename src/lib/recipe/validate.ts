import { CUISINE_NAMES, DIETS, DIFFICULTIES, type Diet, type Difficulty } from '../../data/cuisines';
import type { RecipeInput } from '../data/types';
import { isPlateKey } from '../plateArt';

/** Limits shared by the form, the stores and firestore.rules. Keep them in sync. */
export const LIMITS = {
  title: 120,
  description: 600,
  notes: 1500,
  line: 400,
  ingredients: 80,
  steps: 60,
  prepMinutes: 1440,
  cookMinutes: 2880,
  servings: 50,
  reviewText: 1000,
  authorName: 80,
} as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function toLines(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map(x => x.trim().slice(0, LIMITS.line))
    .filter(Boolean)
    .slice(0, max);
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Coerces anything (form state, a stored document written by an older version,
 * data from another viewer) into a well-formed RecipeInput.
 */
export function normaliseRecipeInput(raw: unknown): RecipeInput {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const diet = Array.isArray(r.diet)
    ? [...new Set(r.diet.filter((d): d is Diet => (DIETS as readonly unknown[]).includes(d)))]
    : [];
  const difficulty = (DIFFICULTIES as readonly unknown[]).includes(r.difficulty)
    ? (r.difficulty as Difficulty)
    : 'Easy';
  const cuisine = typeof r.cuisine === 'string' && CUISINE_NAMES.includes(r.cuisine) ? r.cuisine : 'Other';
  return {
    title: text(r.title, LIMITS.title),
    description: text(r.description, LIMITS.description),
    cuisine,
    difficulty,
    prepMinutes: clamp(toInt(r.prepMinutes, 0), 0, LIMITS.prepMinutes),
    cookMinutes: clamp(toInt(r.cookMinutes, 0), 0, LIMITS.cookMinutes),
    servings: clamp(toInt(r.servings, 2) || 1, 1, LIMITS.servings),
    diet,
    ingredients: toLines(r.ingredients, LIMITS.ingredients),
    steps: toLines(r.steps, LIMITS.steps),
    notes: text(r.notes, LIMITS.notes),
    plate: isPlateKey(r.plate) ? r.plate : '',
  };
}

export type RecipeErrors = Partial<Record<'title' | 'ingredients' | 'steps', string>>;

export function validateRecipeInput(input: RecipeInput): RecipeErrors {
  const errors: RecipeErrors = {};
  if (!input.title) errors.title = 'Give the recipe a name.';
  if (!input.ingredients.length) errors.ingredients = 'Add at least one ingredient, one per line.';
  if (!input.steps.length) errors.steps = 'Add at least one step, one per line.';
  return errors;
}

export function normaliseRating(value: unknown): number {
  return clamp(toInt(value, 0), 0, 5);
}
