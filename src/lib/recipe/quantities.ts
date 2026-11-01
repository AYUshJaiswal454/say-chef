/**
 * Reads the amount at the start of an ingredient line ("1 1/2 cups", "½ tsp", "2-3 cloves")
 * and rescales it when the cook changes the number of servings.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};

const NUMBER_TOKEN = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+(?:\.\d+)?)`;
const QUANTITY_RE = new RegExp(
  String.raw`^\s*(${NUMBER_TOKEN})(?:\s*(?:-|–|to)\s*(${NUMBER_TOKEN}))?(?=\s|$)`,
);

export interface ParsedIngredient {
  qty: number | null;
  /** Upper bound when the line gives a range ("2-3 cloves"). */
  qty2: number | null;
  /** Everything after the amount: "cups basmati rice, rinsed". */
  rest: string;
}

export function parseNumber(token: string): number {
  const s = token.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = s.match(/^(\d*)([½⅓⅔¼¾⅛⅜⅝⅞])$/);
  if (m) return (m[1] ? Number(m[1]) : 0) + UNICODE_FRACTIONS[m[2]];
  return parseFloat(s);
}

export function parseIngredient(line: string): ParsedIngredient {
  const m = line.match(QUANTITY_RE);
  if (!m) return { qty: null, qty2: null, rest: line.trim() };
  return {
    qty: parseNumber(m[1]),
    qty2: m[2] ? parseNumber(m[2]) : null,
    rest: line.slice(m[0].length).trim(),
  };
}

const NICE_FRACTIONS: Array<[number, string]> = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

/** Formats a scaled amount the way a cook would write it: 1½, ⅔, 250, 0.3. */
export function formatQuantity(q: number, rest = ''): string {
  // Metric weights and volumes read better as round numbers.
  if (/^(g|kg|ml|l)\b/i.test(rest) && q >= 20) return String(Math.round(q / 5) * 5);
  if (q >= 10) return String(Math.round(q));
  const whole = Math.floor(q);
  const frac = q - whole;
  if (frac < 0.04) return String(whole);
  if (frac > 0.96) return String(whole + 1);
  let best = '';
  let bestDiff = 1;
  for (const [value, glyph] of NICE_FRACTIONS) {
    const diff = Math.abs(frac - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = glyph;
    }
  }
  if (bestDiff < 0.04) return (whole ? String(whole) : '') + best;
  return String(Math.round(q * 10) / 10);
}

export interface ScaledParts {
  /** The formatted amount, or "" when the line has none ("Salt, to taste"). */
  q: string;
  rest: string;
}

export function scaleParts(line: string, factor: number): ScaledParts {
  const p = parseIngredient(line);
  if (p.qty === null) return { q: '', rest: line.trim() };
  const q =
    formatQuantity(p.qty * factor, p.rest) + (p.qty2 !== null ? '–' + formatQuantity(p.qty2 * factor, p.rest) : '');
  return { q, rest: p.rest };
}

export function scaleLine(line: string, factor: number): string {
  const { q, rest } = scaleParts(line, factor);
  return q ? `${q} ${rest}` : rest;
}
