import type { PlateKey } from '../lib/plateArt';

/**
 * The cuisines a recipe can belong to. Adding one is a great first contribution:
 * add an entry here and pick the plate illustration that suits it best.
 * The list is shown in this order in the filters and the recipe form.
 */
export interface Cuisine {
  name: string;
  /** Plate illustration used when a recipe doesn't choose its own. */
  plate: PlateKey;
}

export const CUISINES: Cuisine[] = [
  { name: 'Indian', plate: 'curry' },
  { name: 'Italian', plate: 'noodle' },
  { name: 'Mexican', plate: 'greens' },
  { name: 'Thai', plate: 'herb' },
  { name: 'Japanese', plate: 'glaze' },
  { name: 'Chinese', plate: 'noodle' },
  { name: 'Korean', plate: 'kimchi' },
  { name: 'Mediterranean', plate: 'skillet' },
  { name: 'Middle Eastern', plate: 'chickpea' },
  { name: 'American', plate: 'stack' },
  { name: 'French', plate: 'cocoa' },
  { name: 'Other', plate: 'tomato' },
];

export const CUISINE_NAMES = CUISINES.map(c => c.name);

export const DIETS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'High-protein'] as const;
export type Diet = (typeof DIETS)[number];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function defaultPlate(cuisine: string): PlateKey {
  return CUISINES.find(c => c.name === cuisine)?.plate ?? 'tomato';
}
