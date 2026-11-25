// render.js — All canvas drawing for Golden Wok. Every picture in the game is
// drawn here in code: night-market backdrop, order tickets, stations, bowls,
// HUD and every screen. No images, no fonts loaded from anywhere.

import {
  CANVAS_W, CANVAS_H, DAY_LENGTH_S, INGREDIENTS, ingredientById,
  PERFECT_MIN, PERFECT_MAX, LAYOUT, DAY_SETTINGS,
} from './config.js';
import { findMatchingTicket } from './orders.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, colour, align, weight) {
  ctx.fillStyle = colour || '#fff';
  ctx.font = (weight || 'bold') + ' ' + size + 'px Verdana, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- ingredient art: a little drawn morsel per ingredient ---
export function drawIngredientIcon(ctx, id, cx, cy, r) {
  const ing = ingredientById(id);
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'noodle') {
    ctx.strokeStyle = ing.colour; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, (i - 1) * r * 0.45, r * 0.55, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else if (id === 'chicken') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.65, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'shrimp') {
    ctx.strokeStyle = ing.colour; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = ing.dark;
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.55, r * 0.18, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'pepper') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.95, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.fillRect(-r * 0.12, -r * 1.15, r * 0.24, r * 0.4);
  } else if (id === 'egg') {
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'greens') {
    ctx.strokeStyle = ing.colour; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = -0.5 + i * 0.5;
      ctx.beginPath(); ctx.moveTo(0, r * 0.7);
      ctx.quadraticCurveTo(Math.sin(a) * r, 0, Math.sin(a) * r * 1.4, -r * 0.8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDishIcon(ctx, dish, cx, cy, r) {
  // A little serving bowl with the dish's ingredients as dots.
  ctx.fillStyle = '#b3392e';
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r, 0, Math.PI); ctx.fill();
  ctx.fillRect(cx - r, cy + r * 0.25, r * 2, r * 0.28);
  ctx.fillStyle = '#7a1f18';
  ctx.fillRect(cx - r * 0.55, cy + r * 0.5, r * 1.1, r * 0.22);
  dish.needs.forEach((id, i) => {
    const a = (i / dish.needs.length) * Math.PI * 2 - Math.PI / 2;
    drawIngredientIcon(ctx, id, cx + Math.cos(a) * r * 0.5, cy - r * 0.15 + Math.sin(a) * r * 0.3, r * 0.3);
  });
}

function drawLantern(ctx, x, y, r, hue, t) {
  const sway = Math.sin(t * 0.9 + x) * 3;
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x + sway, y - r * 0.5); ctx.stroke();
  const g = ctx.createRadialGradient(x + sway - r * 0.3, y - r * 0.3, r * 0.1, x + sway, y, r * 1.2);
  g.addColorStop(0, hue === 'red' ? '#ff6b5e' : '#ffd166');
  g.addColorStop(1, hue === 'red' ? '#c0392b' : '#e0a100');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x + sway, y, r * 0.75, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7d774';
  ctx.fillRect(x + sway - r * 0.2, y - r * 1.15, r * 0.4, r * 0.25);
  ctx.fillRect(x + sway - r * 0.2, y + r * 0.9, r * 0.4, r * 0.25);
}

function drawBackground(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, '#1a1033'); sky.addColorStop(0.45, '#3b1d4e'); sky.addColorStop(1, '#5a2a3a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Stars.
  ctx.fillStyle = '#fff8d0';
  for (let i = 0; i < 40; i++) {
    const x = (i * 173) % CANVAS_W, y = (i * 97) % 120;
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // String lights.
  ctx.strokeStyle = '#2c1e12'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 26); ctx.quadraticCurveTo(640, 66, 1280, 26); ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const x = 40 + i * 78;
    const y = 26 + Math.sin((x / 1280) * Math.PI) * 36;
    const on = (i + Math.floor(t * 2)) % 3 !== 0;
    ctx.fillStyle = on ? ['#ffd166', '#ff6b5e', '#7ee081'][i % 3] : '#5a4a3a';
    ctx.beginPath(); ctx.arc(x, y + 8, 6, 0, Math.PI * 2); ctx.fill();
  }
  drawLantern(ctx, 70, 60, 22, 'red', t);
  drawLantern(ctx, 1210, 60, 22, 'gold', t);
  // Stall awning: red and cream stripes.
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c0392b' : '#f5e6c8';
    ctx.fillRect(i * 80, 64, 80, 20);
  }
  ctx.fillStyle = '#8e2318'; ctx.fillRect(0, 84, CANVAS_W, 6);
  // Back wall + counter.
  ctx.fillStyle = '#4a2c1a'; ctx.fillRect(0, 210, CANVAS_W, 330);
  ctx.fillStyle = '#5d3a22'; ctx.fillRect(0, 210, CANVAS_W, 10);
  ctx.fillStyle = '#6b4426'; ctx.fillRect(0, 470, CANVAS_W, 70);
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(0, 470, CANVAS_W, 8);
  ctx.fillStyle = '#3a2113'; ctx.fillRect(0, 690, CANVAS_W, 30);
}

function drawHud(ctx, state) {
  // Top bar: day, timer, coins, combo, hearts, mute.
  ctx.fillStyle = 'rgba(20,10,20,0.55)';
  roundRect(ctx, 16, 8, 1248, 48, 10); ctx.fill();
  const settings = DAY_SETTINGS[state.day] || DAY_SETTINGS[3];
  text(ctx, settings.label, 32, 33, 20, '#ffd166');
  // Day timer bar.
  const frac = Math.max(0, state.timeLeft / DAY_LENGTH_S);
  ctx.fillStyle = '#2a1a2e'; roundRect(ctx, 300, 18, 420, 26, 8); ctx.fill();
  ctx.fillStyle = frac < 0.2 ? '#ff5252' : '#ffb703';
  if (frac > 0) { roundRect(ctx, 300, 18, 420 * frac, 26, 8); ctx.fill(); }
  text(ctx, Math.ceil(state.timeLeft) + 's', 510, 32, 18, '#fff', 'center');
  text(ctx, '🪙 ' + state.coins, 780, 33, 22, '#ffd166');
  text(ctx, 'Combo x' + state.combo, 920, 33, 20, state.combo > 1 ? '#7ee081' : '#ddd');
  // Hearts.
  for (let i = 0; i < 3; i++) {
    ctx.font = '22px Verdana';
    ctx.fillText(i < state.hearts ? '❤️' : '🖤', 1060 + i * 34, 33);
  }
  // Mute button.
  ctx.fillStyle = '#3a2a4a'; roundRect(ctx, 1180, 14, 68, 34, 8); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; roundRect(ctx, 1180, 14, 68, 34, 8); ctx.stroke();
  text(ctx, state.muted ? '🔇' : '🔊', 1214, 32, 20, '#fff', 'center');
}

function drawTickets(ctx, state) {
  const rail = LAYOUT.orderRail;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, rail.x, rail.y, rail.w, rail.h, 12); ctx.fill();
  text(ctx, 'ORDER BOARD', rail.x + 12, rail.y - 12, 14, '#ffd166');
  state.tickets.forEach((ticket, i) => {
    const x = rail.x + 12 + i * (LAYOUT.ticket.w + LAYOUT.ticket.gap);
    const y = rail.y + 7;
    const urgent = ticket.timeLeft < 12;
    ctx.fillStyle = urgent ? '#fff0e0' : '#fdf6e3';
    roundRect(ctx, x, y, LAYOUT.ticket.w, LAYOUT.ticket.h, 10); ctx.fill();
    ctx.strokeStyle = urgent ? '#e74c3c' : '#c9a227'; ctx.lineWidth = 3;
    roundRect(ctx, x, y, LAYOUT.ticket.w, LAYOUT.ticket.h, 10); ctx.stroke();
    drawDishIcon(ctx, ticket.dish, x + 44, y + 36, 30);
    text(ctx, ticket.dish.name, x + 84, y + 22, 16, '#3a2113');
    text(ctx, '$' + ticket.dish.price, x + 84, y + 46, 15, '#b25a2a');
    // Ingredient dots.
    ticket.dish.needs.forEach((id, j) => {
      drawIngredientIcon(ctx, id, x + 96 + j * 26, y + 72, 11);
    });
    // Countdown bar.
    const frac = Math.max(0, ticket.timeLeft / ticket.timeMax);
    ctx.fillStyle = '#e8dcc0'; roundRect(ctx, x + 12, y + 88, LAYOUT.ticket.w - 24, 8, 4); ctx.fill();
    ctx.fillStyle = urgent ? '#e74c3c' : '#27ae60';
    if (frac > 0) { roundRect(ctx, x + 12, y + 88, (LAYOUT.ticket.w - 24) * frac, 8, 4); ctx.fill(); }
  });
  if (state.tickets.length === 0) {
    text(ctx, 'No orders yet — the night is young…', rail.x + 360, rail.y + 60, 18, '#e8dcc0', 'center');
  }
}

function drawBoard(ctx, state) {
  const b = LAYOUT.board;
  ctx.fillStyle = '#a9805a'; roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.fillStyle = '#c9a06a'; roundRect(ctx, b.x + 10, b.y + 10, b.w - 20, b.h - 20, 8); ctx.fill();
  text(ctx, 'CHOPPING BOARD', b.x + b.w / 2, b.y + 22, 13, '#5d3a22', 'center');
  text(ctx, 'click / SPACE to chop', b.x + b.w / 2, b.y + b.h - 14, 11, '#7a5a3a', 'center');
  if (state.board) {
    drawIngredientIcon(ctx, state.board.id, b.x + b.w / 2, b.y + 88, 34);
    if (!state.board.chopped) {
      // Chop progress ring.
      const frac = state.board.chops / 3;
      ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + 88, 48, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      text(ctx, state.board.chops + "/3 chops", b.x + b.w / 2, b.y + 132, 13, "#5d3a22", "center");
    } else {
      text(ctx, "CHOPPED ✓ — click the wok!", b.x + b.w / 2, b.y + 132, 13, "#1f6b3e", "center");
    }
  } else {
    text(ctx, 'empty — pick a bowl below', b.x + b.w / 2, b.y + 88, 14, '#8a6a4a', 'center');
  }
}

function drawFlame(ctx, cx, cy, t, scale) {
  for (let i = 0; i < 5; i++) {
    const wob = Math.sin(t * 7 + i * 1.7) * 4;
    const h = (26 + 10 * Math.sin(t * 9 + i * 2.1)) * scale;
    const grad = ctx.createLinearGradient(0, cy, 0, cy - h);
    grad.addColorStop(0, '#ff9d00'); grad.addColorStop(0.6, '#ff5e00'); grad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 14 + i * 7 + wob, cy);
    ctx.quadraticCurveTo(cx - 6 + i * 7 + wob, cy - h, cx + wob, cy - h * 1.15);
    ctx.quadraticCurveTo(cx + 6 + i * 7 + wob, cy - h, cx + 14 + i * 7 + wob, cy);
    ctx.closePath(); ctx.fill();
  }
}

function drawWok(ctx, state, t) {
  const w = LAYOUT.wok;
  ctx.fillStyle = '#2c2c34'; roundRect(ctx, w.x, w.y, w.w, w.h, 12); ctx.fill();
  ctx.fillStyle = '#3d3d48'; roundRect(ctx, w.x + 10, w.y + 10, w.w - 20, w.h - 20, 8); ctx.fill();
  text(ctx, 'WOK — click to pull out', w.x + w.w / 2, w.y + 22, 13, '#ffd166', 'center');
  // Burner + flame.
  const cx = w.x + w.w / 2, cy = w.y + 128;
  if (state.wok) drawFlame(ctx, cx, cy + 6, t, 1);
  // Wok bowl.
  ctx.fillStyle = '#1a1a20';
  ctx.beginPath(); ctx.ellipse(cx, cy - 6, 110, 34, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#55555f';
  ctx.beginPath(); ctx.ellipse(cx, cy - 10, 110, 30, 0, Math.PI, 0); ctx.fill();
  if (state.wok) {
    drawIngredientIcon(ctx, state.wok.id, cx, cy - 22, 26);
    if (state.wok.burnt) text(ctx, 'BURNT!', cx, cy - 62, 18, '#ff5252', 'center');
  } else {
    text(ctx, 'empty — chop first, then click', cx, cy - 24, 12, '#9a9aa5', 'center');
  }
  // Timing bar with the green perfect zone.
  const bx = w.x + 20, bw = w.w - 40;
  ctx.fillStyle = '#1a1a20'; roundRect(ctx, bx, w.y + w.h - 26, bw, 14, 7); ctx.fill();
  ctx.fillStyle = 'rgba(46,204,113,0.55)';
  ctx.fillRect(bx + (bw * PERFECT_MIN) / 100, w.y + w.h - 26, (bw * (PERFECT_MAX - PERFECT_MIN)) / 100, 14);
  if (state.wok) {
    const frac = Math.min(1, state.wok.cook / 100);
    ctx.fillStyle = state.wok.burnt ? '#e74c3c' : '#ffb703';
    roundRect(ctx, bx, w.y + w.h - 26, Math.max(4, bw * frac), 14, 7); ctx.fill();
  }
  text(ctx, 'green = perfect', w.x + w.w - 14, w.y + w.h - 34, 10, '#9a9aa5', 'right');
}

function drawPlate(ctx, state, t) {
  const p = LAYOUT.plate;
  const ready = findMatchingTicket(state);
  const glow = ready ? (0.5 + 0.5 * Math.sin(t * 5)) : 0;
  if (ready) {
    ctx.save();
    ctx.shadowColor = '#7ee081'; ctx.shadowBlur = 30 + glow * 25;
    ctx.fillStyle = '#2e7d32'; roundRect(ctx, p.x - 6, p.y - 6, p.w + 12, p.h + 12, 14); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#e8e0d0'; roundRect(ctx, p.x, p.y, p.w, p.h, 12); ctx.fill();
  ctx.fillStyle = '#c9bda6'; roundRect(ctx, p.x + 10, p.y + 10, p.w - 20, p.h - 20, 8); ctx.fill();
  text(ctx, 'ASSEMBLY PLATE', p.x + p.w / 2, p.y + 22, 13, '#5d3a22', 'center');
  if (ready) {
    text(ctx, '★ READY TO SERVE ★', p.x + p.w / 2, p.y + 44, 16, '#1f6b3e', 'center');
  }
  if (state.plate.length === 0) {
    text(ctx, 'cooked food lands here', p.x + p.w / 2, p.y + 96, 14, '#8a7a5a', 'center');
  } else {
    state.plate.forEach((item, i) => {
      const cx = p.x + 60 + i * 62, cy = p.y + 100;
      if (item.burnt) {
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
        text(ctx, '✕', cx, cy, 22, '#ff5252', 'center');
      } else {
        drawIngredientIcon(ctx, item.id, cx, cy, 24);
      }
    });
    const burnt = state.plate.some((i) => i.burnt);
    text(ctx, burnt ? 'BURNT — click the trash!' : state.plate.length + ' item(s) plated',
      p.x + p.w / 2, p.y + p.h - 14, 12, burnt ? '#c0392b' : '#5d3a22', 'center');
  }
}

function drawServeWindow(ctx, state, t) {
  const s = LAYOUT.serve;
  const ready = findMatchingTicket(state);
  ctx.fillStyle = ready ? '#2e7d32' : '#6b4426';
  roundRect(ctx, s.x, s.y, s.w, s.h, 12); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
  roundRect(ctx, s.x, s.y, s.w, s.h, 12); ctx.stroke();
  text(ctx, 'SERVE', s.x + s.w / 2, s.y + 26, 18, '#ffd166', 'center');
  text(ctx, '🛎️', s.x + s.w / 2, s.y + 80, 40, '#fff', 'center');
  text(ctx, 'click or', s.x + s.w / 2, s.y + 140, 13, '#f5e6c8', 'center');
  text(ctx, 'press ENTER', s.x + s.w / 2, s.y + 162, 13, '#f5e6c8', 'center');
  if (ready) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.fillStyle = 'rgba(126,224,129,' + pulse.toFixed(2) + ')';
    roundRect(ctx, s.x + 10, s.y + 186, s.w - 20, 36, 8); ctx.fill();
    text(ctx, 'READY!', s.x + s.w / 2, s.y + 204, 16, '#123a16', 'center');
  }
  // Trash bin.
  const tr = LAYOUT.trash;
  ctx.fillStyle = '#55555f'; roundRect(ctx, tr.x, tr.y, tr.w, tr.h, 10); ctx.fill();
  ctx.fillStyle = '#77777f'; roundRect(ctx, tr.x + 8, tr.y - 6, tr.w - 16, 12, 6); ctx.fill();
  text(ctx, '🗑 TRASH', tr.x + tr.w / 2, tr.y + 34, 15, '#fff', 'center');
}

function drawBowls(ctx, state) {
  const area = LAYOUT.bowls;
  text(ctx, 'INGREDIENTS — click a bowl or press 1–6', area.x + area.w / 2, area.y - 8, 14, '#ffd166', 'center');
  INGREDIENTS.forEach((ing, i) => {
    const x = area.x + i * (LAYOUT.bowl.w + LAYOUT.bowl.gap);
    const y = area.y;
    ctx.fillStyle = '#f5e6c8';
    ctx.beginPath(); ctx.ellipse(x + LAYOUT.bowl.w / 2, y + 52, 58, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.colour;
    ctx.beginPath(); ctx.ellipse(x + LAYOUT.bowl.w / 2, y + 48, 46, 30, 0, 0, Math.PI * 2); ctx.fill();
    drawIngredientIcon(ctx, ing.id, x + LAYOUT.bowl.w / 2, y + 50, 22);
    ctx.fillStyle = '#7a1f18';
    ctx.beginPath(); ctx.ellipse(x + LAYOUT.bowl.w / 2, y + 78, 58, 14, 0, 0, Math.PI); ctx.fill();
    text(ctx, ing.key + ' · ' + ing.name, x + LAYOUT.bowl.w / 2, y + 108, 14, '#fff', 'center');
  });
}

function drawFloaters(ctx, state) {
  state.floaters.forEach((f) => {
    ctx.globalAlpha = Math.max(0, f.life);
    text(ctx, f.label, f.x, f.y, 22, f.colour, 'center');
    ctx.globalAlpha = 1;
  });
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(15,8,25,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawStars(ctx, cx, cy, n) {
  for (let i = 0; i < 3; i++) {
    ctx.font = '44px Verdana';
    ctx.fillText(i < n ? '⭐' : '☆', cx + (i - 1) * 60, cy);
  }
}

export function drawGame(ctx, state, t) {
  drawBackground(ctx, t);
  drawHud(ctx, state);
  drawTickets(ctx, state);
  drawBoard(ctx, state);
  drawWok(ctx, state, t);
  drawPlate(ctx, state, t);
  drawServeWindow(ctx, state, t);
  drawBowls(ctx, state);
  drawFloaters(ctx, state);

  if (state.screen === 'title') {
    drawOverlay(ctx, state);
    text(ctx, '🍜  GOLDEN WOK  🍜', CANVAS_W / 2, 150, 54, '#ffd166', 'center');
    text(ctx, 'Night Market Rush', CANVAS_W / 2, 210, 30, '#fff', 'center');
    text(ctx, 'Run the busiest wok stall on the street. Chop, fry, plate, serve —', CANVAS_W / 2, 280, 19, '#f5e6c8', 'center');
    text(ctx, 'before the customers walk away hungry!', CANVAS_W / 2, 308, 19, '#f5e6c8', 'center');
    text(ctx, '1–6 pick ingredient  ·  SPACE chop  ·  click wok to cook & pull', CANVAS_W / 2, 360, 18, '#7ee081', 'center');
    text(ctx, 'Green zone = perfect  ·  ENTER serve  ·  P pause  ·  M mute', CANVAS_W / 2, 388, 18, '#7ee081', 'center');
    text(ctx, '3 days · 120 seconds a day · 3 hearts · serve fast for tips', CANVAS_W / 2, 430, 17, '#ffd166', 'center');
    ctx.fillStyle = '#c0392b'; roundRect(ctx, CANVAS_W / 2 - 160, 480, 320, 64, 14); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; roundRect(ctx, CANVAS_W / 2 - 160, 480, 320, 64, 14); ctx.stroke();
    text(ctx, '▶  START DAY 1', CANVAS_W / 2, 513, 24, '#fff', 'center');
    text(ctx, 'click here or press ENTER', CANVAS_W / 2, 580, 15, '#ccc', 'center');
  } else if (state.screen === 'paused') {
    drawOverlay(ctx, state);
    text(ctx, '⏸  PAUSED', CANVAS_W / 2, 300, 44, '#ffd166', 'center');
    text(ctx, 'Press P or click to keep cooking', CANVAS_W / 2, 360, 20, '#fff', 'center');
  } else if (state.screen === 'daycomplete') {
    drawOverlay(ctx, state);
    const last = state.day === 3;
    text(ctx, last ? '🎉  FESTIVAL COMPLETE!  🎉' : '⭐  DAY ' + state.day + ' COMPLETE!  ⭐', CANVAS_W / 2, 180, 40, '#ffd166', 'center');
    drawStars(ctx, CANVAS_W / 2, 270, state.stars);
    text(ctx, 'Dishes served: ' + state.servedToday + '   ·   Coins earned: ' + state.earnedToday, CANVAS_W / 2, 330, 22, '#fff', 'center');
    text(ctx, 'Total coins: ' + state.coins + '   ·   Total score: ' + state.score, CANVAS_W / 2, 368, 20, '#f5e6c8', 'center');
    if (!last) {
      ctx.fillStyle = '#2e7d32'; roundRect(ctx, CANVAS_W / 2 - 170, 430, 340, 60, 14); ctx.fill();
      text(ctx, '▶  START DAY ' + (state.day + 1), CANVAS_W / 2, 461, 22, '#fff', 'center');
    } else {
      text(ctx, 'You fed the whole night market. Golden Wok forever!', CANVAS_W / 2, 440, 20, '#7ee081', 'center');
      ctx.fillStyle = '#c0392b'; roundRect(ctx, CANVAS_W / 2 - 150, 480, 300, 56, 14); ctx.fill();
      text(ctx, '↻  PLAY AGAIN', CANVAS_W / 2, 509, 22, '#fff', 'center');
    }
    text(ctx, 'click the button or press ENTER', CANVAS_W / 2, 580, 15, '#ccc', 'center');
  } else if (state.screen === 'gameover') {
    drawOverlay(ctx, state);
    text(ctx, '💔  DAY FAILED', CANVAS_W / 2, 240, 44, '#ff6b5e', 'center');
    text(ctx, 'Three customers walked away hungry.', CANVAS_W / 2, 310, 20, '#fff', 'center');
    text(ctx, 'Score: ' + state.score + '   ·   Coins: ' + state.coins, CANVAS_W / 2, 350, 20, '#f5e6c8', 'center');
    ctx.fillStyle = '#c0392b'; roundRect(ctx, CANVAS_W / 2 - 150, 420, 300, 60, 14); ctx.fill();
    text(ctx, '↻  TRY AGAIN', CANVAS_W / 2, 451, 22, '#fff', 'center');
    text(ctx, 'click the button or press ENTER', CANVAS_W / 2, 510, 15, '#ccc', 'center');
  }
}
