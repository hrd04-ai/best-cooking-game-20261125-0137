// config.js — Golden Wok: static data only. Ingredients, dishes, day pacing,
// colours and layout constants. No game logic lives here.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const DAY_LENGTH_S = 120;
export const MAX_HEARTS = 3;

// Six ingredients on the counter. key = keyboard shortcut, colour = bowl + art.
export const INGREDIENTS = [
  { id: 'noodle',  name: 'Noodle',  key: '1', colour: '#f2c14e', dark: '#c98f1b' },
  { id: 'chicken', name: 'Chicken', key: '2', colour: '#e8915a', dark: '#b25a2a' },
  { id: 'shrimp',  name: 'Shrimp',  key: '3', colour: '#ff8a7a', dark: '#c94a3c' },
  { id: 'pepper',  name: 'Pepper',  key: '4', colour: '#5fbf4a', dark: '#2f7d22' },
  { id: 'egg',     name: 'Egg',     key: '5', colour: '#fff3b0', dark: '#d9b64a' },
  { id: 'greens',  name: 'Greens',  key: '6', colour: '#3fae6a', dark: '#1f6b3e' },
];

export function ingredientById(id) {
  return INGREDIENTS.find((i) => i.id === id);
}

// A dish is a set of ingredients (multiset). price = base coins on serve.
export const DISHES = [
  { id: 'noodle-soup', name: 'Noodle Soup', price: 12,
    needs: ['noodle', 'egg', 'greens'], minDay: 1 },
  { id: 'chicken-fry', name: 'Chicken Stir-Fry', price: 14,
    needs: ['chicken', 'pepper', 'noodle'], minDay: 1 },
  { id: 'shrimp-noodle', name: 'Shrimp Noodle', price: 16,
    needs: ['shrimp', 'noodle', 'greens'], minDay: 1 },
  { id: 'golden-special', name: 'Golden Wok Special', price: 24,
    needs: ['chicken', 'shrimp', 'egg', 'pepper'], minDay: 2 },
  { id: 'market-feast', name: 'Night Market Feast', price: 30,
    needs: ['noodle', 'chicken', 'shrimp', 'pepper', 'greens'], minDay: 3 },
];

export function dishesForDay(day) {
  return DISHES.filter((d) => d.minDay <= day);
}

// Pacing per day: ticket lifetime, spawn gap, max tickets on the rail,
// cook time (seconds for the wok bar to fill 0..100).
export const DAY_SETTINGS = {
  1: { ticketTime: 50, spawnGap: 9,  maxTickets: 3, cookTime: 4.5, label: 'Day 1 — First Night' },
  2: { ticketTime: 42, spawnGap: 7,  maxTickets: 4, cookTime: 4.0, label: 'Day 2 — Rush Hour' },
  3: { ticketTime: 36, spawnGap: 5.5, maxTickets: 4, cookTime: 3.5, label: 'Day 3 — Festival Night' },
};

export const CHOPS_NEEDED = 3;
// Green (perfect) zone of the wok timing bar, in percent.
export const PERFECT_MIN = 55;
export const PERFECT_MAX = 85;

export const COMBO_MAX = 5;

// Layout rectangles (canvas coordinates, 1280x720).
export const LAYOUT = {
  orderRail: { x: 24, y: 84, w: 1232, h: 118 },
  ticket: { w: 292, h: 104, gap: 16 },
  board:  { x: 60,  y: 300, w: 300, h: 170 },   // chopping board
  wok:    { x: 470, y: 290, w: 340, h: 180 },   // wok station
  plate:  { x: 890, y: 300, w: 300, h: 170 },   // assembly plate
  serve:  { x: 1130, y: 230, w: 126, h: 240 },  // serve window (right edge)
  trash:  { x: 60,  y: 500, w: 110, h: 64 },    // trash bin
  bowls:  { x: 200, y: 540, w: 880, h: 150 },   // ingredient counter
  bowl:   { w: 132, h: 118, gap: 14 },
};

// Deterministic RNG (mulberry32) so ?shot= states are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
