/**
 * Rewrites recipe text so speech synthesis reads it naturally:
 * "1½ tbsp" -> "1 and a half tablespoons", "8-10 mins" -> "8 to 10 minutes".
 */

const AFTER_WHOLE: Record<string, string> = {
  '½': 'a half',
  '⅓': 'a third',
  '⅔': 'two thirds',
  '¼': 'a quarter',
  '¾': 'three quarters',
  '⅛': 'an eighth',
};

const ALONE: Record<string, string> = {
  '½': 'half',
  '⅓': 'a third',
  '⅔': 'two thirds',
  '¼': 'a quarter',
  '¾': 'three quarters',
  '⅛': 'an eighth',
};

const SLASH: Record<string, string> = {
  '1/2': 'half',
  '1/3': 'a third',
  '2/3': 'two thirds',
  '1/4': 'a quarter',
  '3/4': 'three quarters',
  '1/8': 'an eighth',
};

export function toSpeech(text: string): string {
  return text
    .replace(/(\d+)\s*([½⅓⅔¼¾⅛])/g, (_m, n: string, f: string) => `${n} and ${AFTER_WHOLE[f]}`)
    .replace(/[½⅓⅔¼¾⅛]/g, f => ALONE[f])
    .replace(
      /(\d+)\s+(1\/2|1\/3|2\/3|1\/4|3\/4|1\/8)\b/g,
      (_m, n: string, f: string) => `${n} and ${SLASH[f] === 'half' ? 'a half' : SLASH[f]}`,
    )
    .replace(/\b(1\/2|1\/3|2\/3|1\/4|3\/4|1\/8)\b/g, f => SLASH[f])
    // "1 and a half tbsp" is plural; a lone "1", "half" or "a quarter" is singular.
    .replace(/\b(and (?:a half|a third|two thirds|a quarter|three quarters|an eighth)) (tsp|tbsp)\b/gi, (_m, n: string, u: string) =>
      `${n} ${u.toLowerCase() === 'tsp' ? 'teaspoons' : 'tablespoons'}`,
    )
    .replace(/\b(1|half|a quarter|a third|an eighth) tsp\b/gi, '$1 teaspoon')
    .replace(/\btsp\b/gi, 'teaspoons')
    .replace(/\b(1|half|a quarter|a third|an eighth) tbsp\b/gi, '$1 tablespoon')
    .replace(/\btbsp\b/gi, 'tablespoons')
    .replace(/\bhalf (teaspoon|tablespoon|cup|kilogram|litre)\b/g, 'half a $1')
    .replace(/(\d)\s?kg\b/g, '$1 kilograms')
    .replace(/(\d)\s?g\b/g, '$1 grams')
    .replace(/(\d)\s?ml\b/g, '$1 millilitres')
    .replace(/\bmins?\b/g, 'minutes')
    .replace(/\bhrs?\b/g, 'hours')
    .replace(/\bsecs?\b/g, 'seconds')
    .replace(/(\d)\s*[–-]\s*(\d)/g, '$1 to $2')
    .replace(/°C\b/g, ' degrees Celsius')
    .replace(/°F\b/g, ' degrees Fahrenheit');
}

/** Splits text into sentence-sized chunks; some browsers cut off long utterances. */
export function speechChunks(text: string): string[] {
  const spoken = toSpeech(text);
  const parts = spoken.match(/[^.!?;:]+[.!?;:]?/g) ?? [spoken];
  return parts.map(s => s.trim()).filter(Boolean);
}
