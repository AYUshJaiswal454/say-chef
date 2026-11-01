/**
 * Draws a top-down plate illustration for a recipe as an SVG string: an enamel-rimmed
 * plate on a gingham cloth with a dish on it. The same seed always draws the same plate,
 * so every recipe has a stable picture without anyone uploading a photo.
 * No user text ever reaches the SVG, so it is safe to inject.
 */

type PlateStyle = 'stew' | 'eggs' | 'scatter' | 'noodles' | 'stack' | 'swirl' | 'cup';

interface PlatePreset {
  label: string;
  food: string;
  accents: string[];
  cloth: string;
  style: PlateStyle;
  eggs?: number;
}

export const PLATES = {
  curry: { label: 'Curry gold', food: '#E2A12B', accents: ['#B9561C', '#3F8A3C', '#FBE7B4'], cloth: '#C8412E', style: 'stew' },
  tomato: { label: 'Tomato', food: '#D2412B', accents: ['#F4C04E', '#3E7F3A', '#FFF4E0'], cloth: '#2D56C8', style: 'stew' },
  herb: { label: 'Green curry', food: '#86A843', accents: ['#C8402B', '#2E6930', '#F3EED6'], cloth: '#B8322A', style: 'stew' },
  glaze: { label: 'Glaze', food: '#8C4A1E', accents: ['#F3E9D2', '#5E9B3A', '#C9803E'], cloth: '#1F7F7A', style: 'stew' },
  skillet: { label: 'Skillet eggs', food: '#C93A22', accents: ['#3E7F3A', '#F1E4C8'], cloth: '#E1A52C', style: 'eggs', eggs: 5 },
  kimchi: { label: 'Fried rice', food: '#D2603A', accents: ['#2E6B34', '#1C1C1C'], cloth: '#3A5FC4', style: 'eggs', eggs: 1 },
  greens: { label: 'Garden', food: '#6CA548', accents: ['#2E6B34', '#E7CF55', '#C9483A'], cloth: '#E3A42A', style: 'scatter' },
  noodle: { label: 'Noodles', food: '#EBC66E', accents: ['#C9472D', '#3F7D3A', '#2B2B2B'], cloth: '#2F6E52', style: 'noodles' },
  stack: { label: 'Stack', food: '#D9A05A', accents: ['#7A3B1E', '#3F5FB5', '#FFF1C9'], cloth: '#4E86D8', style: 'stack' },
  chickpea: { label: 'Chickpea', food: '#E5C69A', accents: ['#B5421B', '#5B7F2E', '#D4A84A'], cloth: '#6A4FB0', style: 'swirl' },
  chai: { label: 'Chai', food: '#B9814F', accents: ['#E8CBA6', '#6B3E20', '#9DBA6A'], cloth: '#1F8A8A', style: 'cup' },
  cocoa: { label: 'Cocoa', food: '#5B3524', accents: ['#80513A', '#2A170E', '#C2304A'], cloth: '#D98BA6', style: 'cup' },
} satisfies Record<string, PlatePreset>;

export type PlateKey = keyof typeof PLATES;
export const PLATE_KEYS = Object.keys(PLATES) as PlateKey[];

export function isPlateKey(value: unknown): value is PlateKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLATES, value);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((target - r) * p + r);
  g = Math.round((target - g) * p + g);
  b = Math.round((target - b) * p + b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const f = (v: number) => v.toFixed(1);

/** A smooth, slightly wobbly closed shape (Catmull-Rom through jittered points). */
function blobPath(cx: number, cy: number, r: number, jitter: number, n: number, rand: () => number): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - jitter + rand() * jitter * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${f(p1[0])},${f(p1[1])}`;
    d +=
      `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

const cache = new Map<string, string>();
let idSequence = 0;

export function plateSvg(seed: string, key: PlateKey): string {
  const cacheKey = `${seed}|${key}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const P: PlatePreset = PLATES[key] ?? PLATES.tomato;
  const R = mulberry32(hash(cacheKey));
  const id = `plate${++idSequence}`;
  const C: [number, number] = [200, 150];
  const inDisc = (rad: number): [number, number] => {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * rad;
    return [C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d];
  };
  const dot = (x: number, y: number, r: number, c: string, o = 1) =>
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" opacity="${o}"/>`;
  const leaf = (x: number, y: number, rx: number, ry: number, c: string, o = 1) =>
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${c}" opacity="${o}" transform="rotate(${Math.round(R() * 180)} ${f(x)} ${f(y)})"/>`;

  let food = '';
  if (P.style === 'stew' || P.style === 'eggs' || P.style === 'swirl') {
    food += `<path d="${blobPath(C[0], C[1], 82, 0.09, 9, R)}" fill="${shade(P.food, -0.12)}"/>`;
    food += `<path d="${blobPath(C[0], C[1] - 2, 76, 0.09, 9, R)}" fill="${P.food}"/>`;
    food += `<path d="${blobPath(C[0] - 10, C[1] - 8, 48, 0.2, 7, R)}" fill="${shade(P.food, 0.16)}" opacity=".75"/>`;
  }

  if (P.style === 'stew') {
    for (let i = 0; i < 9; i++) {
      const [x, y] = inDisc(60);
      food += leaf(x, y, 9 + R() * 6, 6 + R() * 4, shade(P.food, -0.18), 0.55);
    }
    food += `<path d="M${C[0] - 34},${C[1] + 10} q17,-22 35,-5 t36,-3" fill="none" stroke="${P.accents[2]}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
    for (let i = 0; i < 16; i++) {
      const [x, y] = inDisc(64);
      food += leaf(x, y, 3 + R() * 4, 1.6 + R() * 1.8, P.accents[1]);
    }
    for (let i = 0; i < 10; i++) {
      const [x, y] = inDisc(66);
      food += dot(x, y, 1.4 + R() * 2.4, P.accents[0], 0.85);
    }
  } else if (P.style === 'eggs') {
    for (let i = 0; i < 14; i++) {
      const [x, y] = inDisc(66);
      food += leaf(x, y, 4 + R() * 5, 2 + R() * 2, P.accents[1] ?? '#333', 0.9);
    }
    const n = P.eggs ?? 1;
    const spots: Array<[number, number]> =
      n === 1
        ? [[C[0] + 6, C[1] - 4]]
        : Array.from({ length: n }, (_, i) => {
            const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
            return [C[0] + Math.cos(a) * 42, C[1] + Math.sin(a) * 42];
          });
    const er = n === 1 ? 36 : 21;
    for (const [x, y] of spots) {
      food +=
        `<path d="${blobPath(x, y, er, 0.16, 8, R)}" fill="#FBF8F1"/>` +
        dot(x + 1, y + 1, er * 0.42, '#F2AE24') +
        dot(x - er * 0.14, y - er * 0.14, er * 0.12, '#FFE3A1', 0.9);
    }
    for (let i = 0; i < 18; i++) {
      const [x, y] = inDisc(70);
      food += leaf(x, y, 2.5 + R() * 3, 1.3 + R() * 1.4, P.accents[0]);
    }
  } else if (P.style === 'swirl') {
    for (let r = 64; r > 14; r -= 13) {
      food += `<circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="${shade(P.food, -0.14)}" stroke-width="3" stroke-dasharray="${Math.round(r * 2.4)} ${Math.round(r * 1.2)}" transform="rotate(${Math.round(R() * 360)} ${C[0]} ${C[1]})" opacity=".7"/>`;
    }
    food += `<path d="${blobPath(C[0], C[1], 26, 0.25, 7, R)}" fill="${P.accents[2]}" opacity=".85"/>`;
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2;
      const d = 20 + R() * 14;
      const x = C[0] + Math.cos(a) * d;
      const y = C[1] + Math.sin(a) * d;
      food += dot(x, y, 6, shade(P.food, -0.05)) + dot(x - 1.5, y - 1.5, 2.2, shade(P.food, 0.3));
    }
    for (let i = 0; i < 26; i++) {
      const [x, y] = inDisc(56);
      food += dot(x, y, 0.9 + R() * 1.6, P.accents[0], 0.9);
    }
    for (let i = 0; i < 9; i++) {
      const [x, y] = inDisc(48);
      food += leaf(x, y, 3, 1.6, P.accents[1]);
    }
  } else if (P.style === 'scatter') {
    food += `<circle cx="${C[0]}" cy="${C[1]}" r="86" fill="${shade(P.food, -0.35)}" opacity=".22"/>`;
    const colours = [P.food, shade(P.food, 0.18), P.accents[0], P.food, shade(P.food, -0.15), P.accents[0]];
    for (let i = 0; i < 38; i++) {
      const [x, y] = inDisc(72);
      food += leaf(x, y, 9 + R() * 12, 4 + R() * 6, colours[Math.floor(R() * colours.length)], 0.95);
    }
    for (let i = 0; i < 9; i++) {
      const [x, y] = inDisc(64);
      food += dot(x, y, 4 + R() * 3, P.accents[2]);
    }
    for (let i = 0; i < 14; i++) {
      const [x, y] = inDisc(66);
      food += leaf(x, y, 5, 2, P.accents[1]);
    }
  } else if (P.style === 'noodles') {
    food += `<circle cx="${C[0]}" cy="${C[1]}" r="82" fill="${shade(P.food, -0.16)}"/>`;
    for (let i = 0; i < 28; i++) {
      const y = C[1] - 66 + i * 4.8 + R() * 2;
      const half = Math.sqrt(Math.max(0, 74 * 74 - (y - C[1]) ** 2));
      if (half < 10) continue;
      let d = `M${f(C[0] - half)},${f(y)}`;
      const seg = 6;
      for (let k = 1; k <= seg; k++) {
        const x = C[0] - half + (2 * half * k) / seg;
        d += ` Q${f(x - half / seg)},${f(y + (k % 2 ? -6 : 6) * (0.4 + R()))} ${f(x)},${f(y + (R() - 0.5) * 4)}`;
      }
      food += `<path d="${d}" fill="none" stroke="${i % 3 ? P.food : shade(P.food, 0.25)}" stroke-width="4.6" stroke-linecap="round"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const [x, y] = inDisc(44);
      food += dot(x, y, 8 + R() * 3, P.accents[0]) + dot(x - 2, y - 2, 3, shade(P.accents[0], 0.3), 0.8);
    }
    for (let i = 0; i < 6; i++) {
      const [x, y] = inDisc(54);
      food += leaf(x, y, 7, 3.5, P.accents[1]);
    }
    for (let i = 0; i < 30; i++) {
      const [x, y] = inDisc(68);
      food += dot(x, y, 0.8 + R() * 0.9, P.accents[2], 0.9);
    }
  } else if (P.style === 'stack') {
    for (let i = 0; i < 3; i++) {
      const ox = (R() - 0.5) * 14;
      const oy = 16 - i * 10;
      const r = 72 - i * 3;
      food +=
        dot(C[0] + ox, C[1] + oy, r, shade(P.food, -0.28)) +
        dot(C[0] + ox, C[1] + oy - 4, r - 1, P.food) +
        dot(C[0] + ox - 8, C[1] + oy - 10, r * 0.55, shade(P.food, 0.12), 0.6);
    }
    food += `<path d="${blobPath(C[0] + 4, C[1] - 14, 36, 0.28, 8, R)}" fill="${P.accents[0]}" opacity=".85"/>`;
    food += `<rect x="${C[0] - 6}" y="${C[1] - 30}" width="22" height="16" rx="3" fill="${P.accents[2]}" transform="rotate(${Math.round(R() * 30 - 15)} ${C[0] + 5} ${C[1] - 22})"/>`;
    for (let i = 0; i < 7; i++) {
      const a = R() * Math.PI * 2;
      const d = 80 + R() * 10;
      food += dot(C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d, 5 + R() * 2, P.accents[1]);
    }
  } else {
    // cup
    food += `<rect x="${C[0] + 50}" y="${C[1] - 13}" width="40" height="26" rx="13" fill="none" stroke="#1E46B4" stroke-width="10"/>`;
    food += dot(C[0], C[1], 70, '#1E46B4') + dot(C[0], C[1], 62, '#F7F8FB') + dot(C[0], C[1], 55, P.food);
    food += `<path d="${blobPath(C[0] - 8, C[1] - 8, 30, 0.22, 7, R)}" fill="${P.accents[0]}" opacity=".7"/>`;
    for (let i = 0; i < 8; i++) {
      const [x, y] = inDisc(40);
      food += dot(x, y, 1.5 + R() * 1.5, P.accents[1], 0.8);
    }
    food += `<rect x="${C[0] - 104}" y="${C[1] + 64}" width="56" height="9" rx="4.5" fill="${P.accents[1]}" transform="rotate(-24 ${C[0] - 76} ${C[1] + 68})"/>`;
    for (let i = 0; i < 4; i++) food += leaf(C[0] - 88 + i * 13, C[1] - 70 + (i % 2) * 8, 6, 3.5, P.accents[2]);
  }

  let specks = '';
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2;
    const d = 114 + R() * 10;
    const light = R() < 0.3;
    specks += dot(C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d, 0.6 + R() * 1.1, light ? '#FFFFFF' : '#0E1A44', light ? 0.7 : 0.5);
  }

  const svg =
    `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
    `<defs><pattern id="${id}g" width="36" height="36" patternUnits="userSpaceOnUse">` +
    `<rect width="36" height="36" fill="${shade(P.cloth, 0.64)}"/><rect width="18" height="36" fill="${P.cloth}" opacity=".42"/>` +
    `<rect width="36" height="18" fill="${P.cloth}" opacity=".42"/></pattern>` +
    `<filter id="${id}s" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    `<rect width="400" height="300" fill="url(#${id}g)"/>` +
    `<circle cx="209" cy="161" r="124" fill="#0B1430" opacity=".3" filter="url(#${id}s)"/>` +
    `<circle cx="200" cy="150" r="124" fill="#F7F8FB"/>` +
    `<circle cx="200" cy="150" r="119.5" fill="none" stroke="#1E46B4" stroke-width="9"/>` +
    `<circle cx="200" cy="150" r="104" fill="none" stroke="#E2E7F2" stroke-width="2"/>` +
    specks +
    food +
    `</svg>`;
  cache.set(cacheKey, svg);
  return svg;
}
