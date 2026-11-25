// main.js — Golden Wok game loop, input and screen flow.
// Wires config + audio + orders + stations + render together and owns the
// mutable game state. Exposes window.__goldenWok for automated play-testing.

import {
  CANVAS_W, CANVAS_H, DAY_LENGTH_S, MAX_HEARTS,
  INGREDIENTS, DISHES, DAY_SETTINGS, LAYOUT, mulberry32,
} from './config.js';
import { SoundEngine } from './audio.js';
import {
  createTicket, spawnTicketIfDue, tickTickets,
  findMatchingTicket, serveTicket, loseTicket,
} from './orders.js';
import {
  sendToBoard, chopBoard, boardToWok, tickWok, pullFromWok, trashPlate,
} from './stations.js';
import { drawGame } from './render.js';
import { applyShotParam } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

function freshState() {
  return {
    screen: 'title', // title | playing | paused | daycomplete | gameover
    day: 1,
    timeLeft: DAY_LENGTH_S,
    coins: 0,
    score: 0,
    combo: 1,
    hearts: MAX_HEARTS,
    served: 0,
    servedToday: 0,
    earnedToday: 0,
    stars: 0,
    tickets: [],
    board: null,
    wok: null,
    plate: [],
    floaters: [],
    lastSpawnAt: -99,
    rng: mulberry32((Date.now() % 100000) + 7),
    muted: false,
    frozen: false,
    animTime: 0,
    allDishes: DISHES,
  };
}

const state = freshState();

function addFloater(x, y, label, colour) {
  state.floaters.push({ x, y, label, colour, life: 1 });
}

function startDay(day) {
  state.day = day;
  state.timeLeft = DAY_LENGTH_S;
  state.hearts = MAX_HEARTS;
  state.servedToday = 0;
  state.earnedToday = 0;
  state.tickets = [];
  state.board = null;
  state.wok = null;
  state.plate = [];
  state.floaters = [];
  state.lastSpawnAt = -99;
  state.screen = 'playing';
  // Two customers are already waiting when the shutters open.
  state.tickets.push(createTicket(day, state.rng, 0));
  state.tickets.push(createTicket(day, state.rng, 0));
  state.lastSpawnAt = 0;
  sound.ensure();
}

function startGame() {
  state.coins = 0;
  state.score = 0;
  state.combo = 1;
  state.served = 0;
  startDay(1);
}

function endDay() {
  sound.stopSizzle();
  state.stars = state.servedToday >= 8 ? 3 : state.servedToday >= 5 ? 2 : 1;
  state.screen = 'daycomplete';
  sound.dayClear();
}

function gameOver() {
  sound.stopSizzle();
  state.screen = 'gameover';
  sound.fail();
}

function tryServe() {
  const ticket = findMatchingTicket(state);
  if (!ticket) return false;
  const earned = serveTicket(state, ticket);
  state.earnedToday += earned;
  state.servedToday += 1;
  addFloater(1040, 250, '+' + earned + ' coins!', '#ffd166');
  sound.serve();
  return true;
}

function update(dt) {
  state.animTime += dt;
  for (const f of state.floaters) { f.life -= dt * 0.7; f.y -= 28 * dt; }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  if (state.screen !== 'playing' || state.frozen) return;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endDay();
    return;
  }
  spawnTicketIfDue(state, DAY_LENGTH_S - state.timeLeft);
  const expired = tickTickets(state, dt);
  for (const t of expired) {
    loseTicket(state);
    addFloater(640, 200, 'Customer left! -1 ❤️', '#ff6b5e');
    sound.fail();
    if (state.hearts <= 0) { gameOver(); return; }
  }
  const wokEvent = tickWok(state, dt);
  if (wokEvent === 'burnt') {
    addFloater(640, 300, 'BURNT! Trash it!', '#ff6b5e');
    sound.burnt();
  }
  if (state.wok) sound.startSizzle(); else sound.stopSizzle();
  // Urgency tick when a ticket is about to expire.
  if (state.tickets.some((t) => t.timeLeft < 5 && Math.floor(t.timeLeft * 2) !== Math.floor((t.timeLeft + dt) * 2))) {
    sound.tick();
  }
}

function loop(ts) {
  const now = ts / 1000;
  const dt = Math.min(0.05, now - (loop.last || now));
  loop.last = now;
  update(dt);
  drawGame(ctx, state, state.animTime);
  requestAnimationFrame(loop);
}

// --- input: mouse ---
function pointIn(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (CANVAS_W / rect.width),
    y: (ev.clientY - rect.top) * (CANVAS_H / rect.height),
  };
}

function onBoardClick() {
  if (!state.board) return;
  if (!state.board.chopped) {
    const r = chopBoard(state);
    sound.chop();
    if (r === 'chopped') addFloater(210, 320, 'Chopped!', '#7ee081');
  } else if (boardToWok(state)) {
    sound.wokDrop();
  }
}

function onWokClick() {
  const r = pullFromWok(state);
  if (r === 'perfect') { sound.ding(); addFloater(640, 300, 'Perfect!', '#7ee081'); }
  else if (r === 'raw') { sound.pickup(); addFloater(640, 300, 'Still raw — cook more!', '#ffd166'); }
  else if (r === 'burnt') { sound.burnt(); addFloater(640, 300, 'Burnt! Trash it!', '#ff6b5e'); }
}

canvas.addEventListener('click', (ev) => {
  sound.ensure();
  const { x, y } = canvasPoint(ev);
  // Mute button works on every screen.
  if (pointIn(x, y, { x: 1180, y: 14, w: 68, h: 34 })) {
    state.muted = !state.muted;
    sound.setMuted(state.muted);
    return;
  }
  if (state.screen === 'title') {
    if (pointIn(x, y, { x: CANVAS_W / 2 - 160, y: 480, w: 320, h: 64 })) startGame();
    return;
  }
  if (state.screen === 'paused') { state.screen = 'playing'; return; }
  if (state.screen === 'daycomplete') {
    if (state.day < 3 && pointIn(x, y, { x: CANVAS_W / 2 - 170, y: 430, w: 340, h: 60 })) startDay(state.day + 1);
    else if (state.day === 3 && pointIn(x, y, { x: CANVAS_W / 2 - 150, y: 480, w: 300, h: 56 })) startGame();
    return;
  }
  if (state.screen === 'gameover') {
    if (pointIn(x, y, { x: CANVAS_W / 2 - 150, y: 420, w: 300, h: 60 })) startGame();
    return;
  }
  if (state.screen !== 'playing') return;

  // Ingredient bowls.
  const area = LAYOUT.bowls;
  for (let i = 0; i < INGREDIENTS.length; i++) {
    const bx = area.x + i * (LAYOUT.bowl.w + LAYOUT.bowl.gap);
    if (pointIn(x, y, { x: bx, y: area.y, w: LAYOUT.bowl.w, h: LAYOUT.bowl.h })) {
      if (sendToBoard(state, INGREDIENTS[i].id)) sound.pickup();
      return;
    }
  }
  if (pointIn(x, y, LAYOUT.board)) { onBoardClick(); return; }
  if (pointIn(x, y, LAYOUT.wok)) { onWokClick(); return; }
  if (pointIn(x, y, LAYOUT.serve)) { tryServe(); return; }
  if (pointIn(x, y, LAYOUT.trash)) {
    if (trashPlate(state)) { sound.chop(); addFloater(115, 490, 'Trashed', '#ccc'); }
  }
});

// --- input: keyboard ---
document.addEventListener('keydown', (ev) => {
  sound.ensure();
  const k = ev.key;
  if (k === 'm' || k === 'M') {
    state.muted = !state.muted;
    sound.setMuted(state.muted);
    return;
  }
  if (state.screen === 'title' || state.screen === 'gameover') {
    if (k === 'Enter') startGame();
    return;
  }
  if (state.screen === 'daycomplete') {
    if (k === 'Enter') { if (state.day < 3) startDay(state.day + 1); else startGame(); }
    return;
  }
  if (k === 'p' || k === 'P') {
    if (state.screen === 'playing') state.screen = 'paused';
    else if (state.screen === 'paused') state.screen = 'playing';
    return;
  }
  if (state.screen !== 'playing') return;
  if (k === ' ') { ev.preventDefault(); onBoardClick(); return; }
  if (k === 'Enter') { tryServe(); return; }
  const ing = INGREDIENTS.find((i) => i.key === k);
  if (ing && sendToBoard(state, ing.id)) sound.pickup();
});

// Screenshot staging (?shot=...) — frozen deterministic states.
applyShotParam(state, new URLSearchParams(window.location.search));

// Test hook: play-test automation reads state and drives the same handlers.
window.__goldenWok = { state, startGame, startDay, tryServe, sound };

requestAnimationFrame(loop);
