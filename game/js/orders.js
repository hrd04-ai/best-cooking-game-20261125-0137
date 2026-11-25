// orders.js — Order tickets: spawning, timing, matching and serving.
// A ticket is a dish a customer waits for; its countdown bar is the pressure.

import { DAY_SETTINGS, dishesForDay, pickRandom } from './config.js';

let nextTicketId = 1;

export function createTicket(day, rng, now) {
  const dish = pickRandom(rng, dishesForDay(day));
  const settings = DAY_SETTINGS[day] || DAY_SETTINGS[3];
  return {
    id: nextTicketId++,
    dish,
    timeLeft: settings.ticketTime,
    timeMax: settings.ticketTime,
    bornAt: now,
  };
}

export function spawnTicketIfDue(state, now) {
  const settings = DAY_SETTINGS[state.day] || DAY_SETTINGS[3];
  if (state.tickets.length >= settings.maxTickets) return;
  if (now - state.lastSpawnAt < settings.spawnGap) return;
  state.tickets.push(createTicket(state.day, state.rng, now));
  state.lastSpawnAt = now;
}

// Advance every ticket countdown; returns the tickets that just expired.
export function tickTickets(state, dt) {
  const expired = [];
  for (const t of state.tickets) t.timeLeft -= dt;
  state.tickets = state.tickets.filter((t) => {
    if (t.timeLeft <= 0) { expired.push(t); return false; }
    return true;
  });
  return expired;
}

// Does the plate's cooked ingredients exactly match a ticket's dish?
export function plateMatchesTicket(plate, ticket) {
  if (plate.length !== ticket.dish.needs.length) return false;
  const have = plate.map((item) => item.id).sort();
  const want = [...ticket.dish.needs].sort();
  return have.every((ing, i) => ing === want[i]);
}

export function findMatchingTicket(state) {
  return state.tickets.find((t) => plateMatchesTicket(state.plate, t)) || null;
}

// Serve the matching ticket: coins = price + time tip, times combo multiplier.
export function serveTicket(state, ticket) {
  const tip = Math.round((ticket.timeLeft / ticket.timeMax) * 8);
  const base = ticket.dish.price + tip;
  const earned = base * state.combo;
  state.coins += earned;
  state.score += earned;
  state.served++;
  state.combo = Math.min(state.combo + 1, 5);
  state.tickets = state.tickets.filter((t) => t.id !== ticket.id);
  state.plate = [];
  return earned;
}

// A ticket expired: the customer storms off, combo resets, a heart is lost.
export function loseTicket(state) {
  state.combo = 1;
  state.hearts -= 1;
}
