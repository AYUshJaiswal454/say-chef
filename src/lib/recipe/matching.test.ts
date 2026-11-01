import { describe, expect, it } from 'vitest';
import {
  findIngredient,
  ingredientKeys,
  pantryMatch,
  parsePantry,
  splitLines,
  stepIngredients,
} from './matching';

const DAL = [
  '1 cup toor dal (split pigeon peas), rinsed',
  '3 cups water',
  '1/2 tsp turmeric',
  '2 tbsp ghee or oil',
  '1 tsp cumin seeds',
  '1 onion, finely chopped',
  '2 tomatoes, chopped',
  '4 garlic cloves, minced',
];

describe('ingredientKeys', () => {
  it('picks the identifying words', () => {
    expect(ingredientKeys('1 onion, finely chopped')).toEqual(['onion']);
    expect(ingredientKeys('4 garlic cloves, minced')).toEqual(['garlic', 'cloves']);
    expect(ingredientKeys('2 tbsp ghee or oil')).toEqual(['ghee', 'oil']);
  });
});

describe('stepIngredients', () => {
  it('finds the ingredients a step mentions, singular or plural', () => {
    const found = stepIngredients('Add the tomatoes and the garlic and cook for 5 minutes.', DAL);
    expect(found.map(f => f.index)).toEqual([6, 7]);
    expect(stepIngredients('Add the onion and sauté.', DAL).map(f => f.index)).toEqual([5]);
  });

  it('returns nothing for steps without ingredients', () => {
    expect(stepIngredients('Serve hot.', DAL)).toEqual([]);
  });
});

describe('findIngredient', () => {
  it('answers "how much" questions', () => {
    expect(findIngredient(DAL, 'turmeric')).toBe('1/2 tsp turmeric');
    expect(findIngredient(DAL, 'tomatoes')).toBe('2 tomatoes, chopped');
    expect(findIngredient(DAL, 'saffron')).toBeNull();
  });
});

describe('pantry', () => {
  it('splits a typed pantry list', () => {
    expect(parsePantry('Rice, eggs and spring onion')).toEqual(['rice', 'eggs', 'spring onion']);
  });

  it('counts what the cook already has', () => {
    expect(pantryMatch(DAL, ['onion', 'garlic', 'saffron'])).toEqual({ matched: 2, have: 2, total: 8 });
  });
});

describe('splitLines', () => {
  it('drops bullets, blank lines and step numbers', () => {
    expect(splitLines('- 1 cup rice\n\n• 2 cups water', false)).toEqual(['1 cup rice', '2 cups water']);
    expect(splitLines('1. Rinse the rice.\nStep 2: Boil it.\n3) Serve.', true)).toEqual([
      'Rinse the rice.',
      'Boil it.',
      'Serve.',
    ]);
  });

  it('keeps leading amounts in ingredient lists', () => {
    expect(splitLines('2 onions\n3 tomatoes', false)).toEqual(['2 onions', '3 tomatoes']);
  });
});
