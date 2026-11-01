import { describe, expect, it } from 'vitest';
import { formatQuantity, parseIngredient, parseNumber, scaleLine, scaleParts } from './quantities';

describe('parseNumber', () => {
  it('reads whole numbers, decimals and fractions', () => {
    expect(parseNumber('2')).toBe(2);
    expect(parseNumber('1.5')).toBe(1.5);
    expect(parseNumber('1/2')).toBe(0.5);
    expect(parseNumber('1 1/2')).toBe(1.5);
    expect(parseNumber('½')).toBe(0.5);
    expect(parseNumber('1½')).toBe(1.5);
  });
});

describe('parseIngredient', () => {
  it('splits the amount from the rest of the line', () => {
    expect(parseIngredient('2 tbsp ghee')).toEqual({ qty: 2, qty2: null, rest: 'tbsp ghee' });
    expect(parseIngredient('1 1/2 cups water')).toEqual({ qty: 1.5, qty2: null, rest: 'cups water' });
    expect(parseIngredient('2-3 green chillies')).toEqual({ qty: 2, qty2: 3, rest: 'green chillies' });
  });

  it('leaves lines without an amount alone', () => {
    expect(parseIngredient('Salt, to taste')).toEqual({ qty: null, qty2: null, rest: 'Salt, to taste' });
    expect(parseIngredient('Maple syrup, to serve').qty).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('uses kitchen fractions', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.5)).toBe('1½');
    expect(formatQuantity(0.333)).toBe('⅓');
    expect(formatQuantity(2.75)).toBe('2¾');
    expect(formatQuantity(3)).toBe('3');
  });

  it('rounds metric amounts and large counts', () => {
    expect(formatQuantity(312.5, 'g paneer')).toBe('315');
    expect(formatQuantity(12.4)).toBe('12');
  });

  it('falls back to one decimal when no fraction fits', () => {
    expect(formatQuantity(0.42)).toBe('0.4');
  });
});

describe('scaling', () => {
  it('scales the amount and keeps the rest', () => {
    expect(scaleLine('1 cup toor dal', 1.5)).toBe('1½ cup toor dal');
    expect(scaleLine('250 g paneer, cubed', 2)).toBe('500 g paneer, cubed');
    expect(scaleLine('2-3 cloves garlic', 2)).toBe('4–6 cloves garlic');
    expect(scaleLine('Salt, to taste', 3)).toBe('Salt, to taste');
  });

  it('exposes the amount separately for styling', () => {
    expect(scaleParts('1/2 tsp turmeric', 2)).toEqual({ q: '1', rest: 'tsp turmeric' });
  });
});
