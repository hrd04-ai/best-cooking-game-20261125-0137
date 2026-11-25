// stations.js — The kitchen stations: chopping board, wok, assembly plate,
// trash. One ingredient moves board -> wok -> plate; burnt food goes to trash.

import { CHOPS_NEEDED, DAY_SETTINGS, PERFECT_MIN, PERFECT_MAX } from './config.js';

// Board: send a fresh ingredient from a bowl onto the board (one at a time).
export function sendToBoard(state, ingredientId) {
  if (state.board) return false;
  state.board = { id: ingredientId, chops: 0, chopped: false };
  return true;
}

// Chop the ingredient on the board. Returns 'chopped' when done, 'chop' else.
export function chopBoard(state) {
  if (!state.board || state.board.chopped) return null;
  state.board.chops += 1;
  if (state.board.chops >= CHOPS_NEEDED) {
    state.board.chopped = true;
    return 'chopped';
  }
  return 'chop';
}

// Move a chopped ingredient from the board into the wok.
export function boardToWok(state) {
  if (!state.board || !state.board.chopped || state.wok) return false;
  state.wok = { id: state.board.id, cook: 0, done: false };
  state.board = null;
  return true;
}

// Advance the wok cooking bar. Returns 'burnt' the moment it overcooks.
export function tickWok(state, dt) {
  if (!state.wok) return null;
  const settings = DAY_SETTINGS[state.day] || DAY_SETTINGS[3];
  state.wok.cook += (dt / settings.cookTime) * 100;
  if (state.wok.cook >= 100) {
    state.wok.cook = 100;
    state.wok.burnt = true;
    return 'burnt';
  }
  return null;
}

// Pull food out of the wok. Returns 'perfect' | 'raw' | 'burnt' | null.
export function pullFromWok(state) {
  if (!state.wok) return null;
  const cook = state.wok.cook;
  const id = state.wok.id;
  if (state.wok.burnt || cook > PERFECT_MAX) {
    state.plate = [{ id, burnt: true }];
    state.wok = null;
    return 'burnt';
  }
  if (cook < PERFECT_MIN) {
    // Undercooked: back to the board, still chopped, cook again.
    state.board = { id, chops: CHOPS_NEEDED, chopped: true };
    state.wok = null;
    return 'raw';
  }
  state.plate.push({ id, burnt: false });
  state.wok = null;
  return 'perfect';
}

// Trash whatever is on the plate (burnt food must be cleared to keep cooking).
export function trashPlate(state) {
  if (state.plate.length === 0) return false;
  state.plate = [];
  return true;
}

export function wokCookPercent(state) {
  return state.wok ? Math.min(100, state.wok.cook) : 0;
}
