// shots.js — Deterministic screenshot staging for Golden Wok.
// ?shot=title|mid|serve|end boots the game into a fixed, pre-filled state
// (seeded RNG, frozen timers) so screenshots are reproducible. Normal play
// without a ?shot param is completely unaffected.

import { DAY_LENGTH_S, mulberry32 } from './config.js';
import { createTicket } from './orders.js';

function basePlayingState(state) {
  state.screen = 'playing';
  state.day = 1;
  state.timeLeft = 87;
  state.coins = 46;
  state.score = 46;
  state.combo = 2;
  state.hearts = 3;
  state.served = 4;
  state.servedToday = 4;
  state.earnedToday = 46;
  state.tickets = [];
  state.board = null;
  state.wok = null;
  state.plate = [];
  state.floaters = [];
  state.frozen = true; // timers hold still for the screenshot
}

function ticketFor(state, dishId, timeLeft) {
  const dish = state.dishesById[dishId];
  const t = createTicket(1, state.rng, 0);
  t.dish = dish;
  t.timeLeft = timeLeft;
  t.timeMax = 50;
  return t;
}

export function applyShotParam(state, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  state.rng = mulberry32(20261125);
  // Index dishes by id for staging.
  state.dishesById = {};
  for (const d of state.allDishes) state.dishesById[d.id] = d;

  if (shot === 'title') {
    basePlayingState(state);
    state.screen = 'title';
    state.tickets = [
      ticketFor(state, 'noodle-soup', 38),
      ticketFor(state, 'chicken-fry', 26),
    ];
    state.board = { id: 'chicken', chops: 2, chopped: false };
    state.wok = { id: 'noodle', cook: 68, done: false };
    return true;
  }
  if (shot === 'mid') {
    basePlayingState(state);
    state.tickets = [
      ticketFor(state, 'noodle-soup', 34),
      ticketFor(state, 'chicken-fry', 22),
      ticketFor(state, 'shrimp-noodle', 44),
    ];
    state.board = { id: 'shrimp', chops: 1, chopped: false };
    state.wok = { id: 'noodle', cook: 62, done: false };
    state.plate = [{ id: 'noodle', burnt: false }, { id: 'greens', burnt: false }];
    state.floaters = [{ x: 640, y: 240, label: '+28 coins!', colour: '#ffd166', life: 0.9 }];
    return true;
  }
  if (shot === 'serve') {
    basePlayingState(state);
    state.coins = 74; state.score = 74; state.combo = 3;
    state.tickets = [
      ticketFor(state, 'chicken-fry', 31),
      ticketFor(state, 'noodle-soup', 18),
    ];
    // Plate exactly matches the Chicken Stir-Fry ticket: ready to serve.
    state.plate = [
      { id: 'chicken', burnt: false },
      { id: 'pepper', burnt: false },
      { id: 'noodle', burnt: false },
    ];
    state.floaters = [{ x: 1040, y: 260, label: 'READY TO SERVE!', colour: '#7ee081', life: 1 }];
    return true;
  }
  if (shot === 'end') {
    basePlayingState(state);
    state.screen = 'daycomplete';
    state.day = 1;
    state.servedToday = 8;
    state.earnedToday = 132;
    state.coins = 132; state.score = 132;
    state.stars = 3;
    return true;
  }
  return false;
}
