import { parseIngredient } from './quantities';

/**
 * Connects free-text steps and questions to the ingredient list:
 * which ingredients a step uses, "how much salt?", and pantry matching.
 */

const STOP_WORDS = new Set(
  (
    'fresh finely roughly thinly very chopped minced sliced diced grated crushed ground large small medium whole ' +
    'cup cups tsp tbsp ml g kg lb oz inch can cans tin handful pinch of and or the to for serve serving extra ' +
    'virgin plain all-purpose boneless skin with green red black white brown yellow sweet smoked dried toasted ' +
    'roasted hot cold ice-cold day-old neutral firm loose cooked rinsed drained trimmed cubed melted softened ' +
    'packed heaped level optional more taste each about save liquid juiced slit wedges into cut sheet'
  ).split(' '),
);

const keyCache = new Map<string, string[]>();

/** The words that identify an ingredient line: "2 onions, finely chopped" -> ["onions"]. */
export function ingredientKeys(line: string): string[] {
  const cached = keyCache.get(line);
  if (cached) return cached;
  const head = parseIngredient(line)
    .rest.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0];
  const keys = new Set<string>();
  for (const alternative of head.split(/\s+or\s+/)) {
    const words = alternative.split(/[^a-z-]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    if (words.length) {
      keys.add(words[0]);
      keys.add(words[words.length - 1]);
    }
  }
  const out = [...keys];
  keyCache.set(line, out);
  return out;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface IngredientRef {
  line: string;
  index: number;
}

/** Ingredients a step mentions, in list order. */
export function stepIngredients(step: string, ingredients: string[]): IngredientRef[] {
  const text = ` ${step.toLowerCase().replace(/[^a-z -]+/g, ' ')} `;
  return ingredients
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      ingredientKeys(line).some(key => {
        const base = key.length > 4 && key.endsWith('s') ? key.slice(0, -1) : key;
        return new RegExp(`\\b${escapeRegExp(base)}(s|es)?\\b`).test(text);
      }),
    );
}

/** Best ingredient line for a spoken question such as "how much salt". */
export function findIngredient(lines: string[], question: string): string | null {
  const words = question
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(w => w.length >= 3);
  let best: string | null = null;
  let bestScore = 0;
  for (const line of lines) {
    const low = line.toLowerCase();
    const score = words.filter(w => low.includes(w.replace(/s$/, ''))).length;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return best;
}

export interface PantryMatch {
  /** How many of the cook's items the recipe uses. */
  matched: number;
  /** How many ingredient lines the cook already has. */
  have: number;
  total: number;
}

/** Splits "rice, eggs and spring onion" into ["rice", "eggs", "spring onion"]. */
export function parsePantry(text: string): string[] {
  return text
    .toLowerCase()
    .split(/,|\band\b|\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function pantryMatch(ingredients: string[], items: string[]): PantryMatch {
  const low = ingredients.map(l => l.toLowerCase());
  const matched = items.filter(item => low.some(l => l.includes(item))).length;
  const have = low.filter(l => items.some(item => l.includes(item))).length;
  return { matched, have, total: low.length };
}

/** Splits pasted or typed text into lines, dropping bullets and step numbers. */
export function splitLines(text: string, stripStepNumbers: boolean): string[] {
  return text
    .split('\n')
    .map(l => {
      let s = l.trim().replace(/^[-•*·▪]\s*/, '');
      if (stripStepNumbers) s = s.replace(/^(step\s*)?\d+\s*[.):-]\s*/i, '');
      return s;
    })
    .filter(Boolean);
}
