import { describe, expect, it } from 'vitest';
import { speechChunks, toSpeech } from './speechText';

describe('toSpeech', () => {
  it('reads fractions and units naturally', () => {
    expect(toSpeech('1½ tbsp butter')).toBe('1 and a half tablespoons butter');
    expect(toSpeech('½ tsp salt')).toBe('half a teaspoon salt');
    expect(toSpeech('1/2 cup milk')).toBe('half a cup milk');
    expect(toSpeech('2½ tsp sugar')).toBe('2 and a half teaspoons sugar');
    expect(toSpeech('1/4 cup cream')).toBe('a quarter cup cream');
    expect(toSpeech('1 1/2 cups water')).toBe('1 and a half cups water');
    expect(toSpeech('1 tsp cumin')).toBe('1 teaspoon cumin');
    expect(toSpeech('2 tsp sugar')).toBe('2 teaspoons sugar');
  });

  it('expands metric units, ranges and temperatures', () => {
    expect(toSpeech('250 g paneer')).toBe('250 grams paneer');
    expect(toSpeech('400 ml coconut milk')).toBe('400 millilitres coconut milk');
    expect(toSpeech('Cook 8-10 mins')).toBe('Cook 8 to 10 minutes');
    expect(toSpeech('Bake at 180°C')).toBe('Bake at 180 degrees Celsius');
  });
});

describe('speechChunks', () => {
  it('splits text into sentences', () => {
    expect(speechChunks('Step 1 of 3. Rinse the rice! Drain it')).toEqual([
      'Step 1 of 3.',
      'Rinse the rice!',
      'Drain it',
    ]);
  });
});
