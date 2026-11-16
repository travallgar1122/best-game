// VOID BLOOM — drawing. Everything the player sees is painted on one canvas
// from the world state: a parallax starfield over nebula washes, neon spores,
// the bloomship, and layered screens for title, upgrade choice, pause and
// game over. No images: every shape is drawn from code each frame.

import { COLORS, FIELD, SHIP } from './config.js';
import { KIND_BRUTE, KIND_SPLITTER, KIND_WEAVER, PHASE_OVER, PHASE_UPGRADE } from './world.js';
import { mulberry32 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

// The starfield is fixed: three depth layers generated once from a constant
// seed, drifting slowly against the ship's position for parallax.
const STAR_LAYERS = [0.25, 0.55, 1].map((depth, layer) => {
  const rand = mulberry32(4100 + layer * 77);
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: rand() * FIELD.width, y: rand() * FIELD.height, r: 0.7 + rand() * 1.6, depth });
  }
  return stars;
});

const NEBULAE = [
  { x: 240, y: 150, r: 340, color: 'rgba(88, 40, 140, 0.20)' },
  { x: 1020, y: 620, r: 400, color: 'rgba(16, 90, 80, 0.18)' },
  { x: 760, y: 120, r: 260, color: 'rgba(140, 40, 90, 0.13)' },
  { x: 180, y: 660, r: 280, color: 'rgba(30, 60, 140, 0.15)' },
];

function drawBackground(ctx, state) {
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const neb of NEBULAE) {
    const g = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
    g.addColorStop(0, neb.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(neb.x - neb.r, neb.y - neb.r, neb.r * 2, neb.r * 2);
  }
  const ship = state.ship;
  for (const layer of STAR_LAYERS) {
    for (const star of layer) {
      const drift = state.time * 4 * star.depth;
      const px = (((star.x - (ship ? ship.x * 0.03 * star.depth : 0) - drift) % FIELD.width) + FIELD.width) % FIELD.width;
      const twinkle = 0.55 + 0.45 * Math.sin(state.time * 2 + star.x);
      ctx.globalAlpha = 0.75 * twinkle;
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(px, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx, ship, time) {
  const blink = ship.invulnTimer > 0 && Math.floor(time * 16) % 2 === 0;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.aim);
  if (ship.muzzle > 0) {
    ctx.fillStyle = `rgba(255, 240, 170, ${0.85 * ship.muzzle})`;
    ctx.beginPath();
    ctx.arc(SHIP.radius + 10, 0, 6 * ship.muzzle + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Petal hull: a teardrop body with two side petals, nose toward the aim.
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.fillStyle = COLORS.bloom;
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.quadraticCurveTo(4, -11, -12, -8);
  ctx.quadraticCurveTo(-17, 0, -12, 8);
  ctx.quadraticCurveTo(4, 11, 19, 0);
  ctx.fill();
  ctx.fillStyle = COLORS.petal;
  ctx.beginPath();
  ctx.ellipse(-8, -11, 8, 4.4, -0.6, 0, Math.PI * 2);
  ctx.ellipse(-8, 11, 8, 4.4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#06351d';
  ctx.beginPath();
  ctx.arc(3, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function enemyColor(kind) {
  if (kind === KIND_BRUTE) return COLORS.brute;
  if (kind === KIND_SPLITTER) return COLORS.spore;
  if (kind === KIND_WEAVER) return COLORS.weaver;
  return '#ffd35c';
}

function drawEnemy(ctx, e, time) {
  const color = enemyColor(e.kind);
  const pulse = 1 + Math.sin(time * 5 + e.seedPhase) * 0.07;
  const r = e.radius * pulse;
  ctx.save();
  ctx.translate(e.x, e.y);
  // Spiky spore silhouette: a ring of bumps around a glowing core.
  ctx.fillStyle = e.flash > 0.4 ? '#ffffff' : color;
  ctx.beginPath();
  const bumps = e.kind === KIND_BRUTE ? 10 : 7;
  for (let i = 0; i < bumps; i += 1) {
    const a = (i / bumps) * Math.PI * 2 + e.seedPhase;
    const bx = Math.cos(a) * r * 0.92;
    const by = Math.sin(a) * r * 0.92;
    ctx.moveTo(bx + r * 0.42, by);
    ctx.arc(bx, by, r * 0.42, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 4, 0.75)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(-r * 0.14, -r * 0.1, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.16, -r * 0.08, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 4);
    ctx.fillStyle = color;
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2 * (e.hp / e.maxHp), 4);
  }
}

function drawHud(ctx, state) {
  const ship = state.ship;
  ctx.fillStyle = 'rgba(4, 10, 8, 0.55)';
  ctx.fillRect(18, 16, 264, 64);
  ctx.strokeStyle = 'rgba(125, 255, 176, 0.5)';
  ctx.strokeRect(18, 16, 264, 64);
  ctx.fillStyle = '#ffb35c';
  ctx.fillRect(30, 30, 240 * Math.max(0, ship.hp / ship.maxHp), 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.strokeRect(30, 30, 240, 13);
  ctx.fillStyle = COLORS.hull;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`HULL ${Math.ceil(ship.hp)} / ${ship.maxHp}`, 30, 66);
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score}`, 1010, 48);
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = COLORS.bloom;
  ctx.fillText(`WAVE ${state.wave}`, 1010, 76);
  if (state.combo > 1) {
    ctx.fillStyle = COLORS.petal;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, 1010, 108);
  }
  const left = state.toSpawn.length + state.enemies.length;
  ctx.fillStyle = 'rgba(234,255,242,0.75)';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`spores left: ${left}`, 30, 108);
  if (ship.dashCooldown > 0) {
    ctx.fillStyle = 'rgba(234,255,242,0.5)';
    ctx.fillText('dash charging…', 30, 132);
  } else {
    ctx.fillStyle = COLORS.bloom;
    ctx.fillText('DASH READY (Shift)', 30, 132);
  }
}

function panel(ctx, w, h) {
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = 'rgba(5, 12, 10, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(125, 255, 176, 0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1;
  return { x, y };
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(3, 6, 12, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bloom;
  ctx.font = '800 92px system-ui, sans-serif';
  ctx.fillText('VOID BLOOM', FIELD.width / 2, 268);
  ctx.fillStyle = COLORS.petal;
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText('the spores are coming for the last garden in the dark', FIELD.width / 2, 312);
  ctx.fillStyle = COLORS.hull;
  ctx.font = '500 21px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — fly        mouse — aim        click / Space — shoot', FIELD.width / 2, 396);
  ctx.fillText('Shift — dash through danger        P — pause        M — mute', FIELD.width / 2, 430);
  ctx.fillText('Clear each wave, pick an upgrade, survive the next.', FIELD.width / 2, 464);
  ctx.fillStyle = COLORS.bloom;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('Click or press Enter to bloom', FIELD.width / 2, 540);
  ctx.textAlign = 'left';
}

function drawUpgrade(ctx, state) {
  const { x, y } = panel(ctx, 720, 300);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bloom;
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave} CLEAR`, FIELD.width / 2, y + 58);
  ctx.fillStyle = COLORS.hull;
  ctx.font = '500 19px system-ui, sans-serif';
  ctx.fillText('Choose how the bloom grows — press 1 or 2', FIELD.width / 2, y + 92);
  state.upgradeChoices.forEach((choice, i) => {
    const cx = x + 36 + i * 330;
    ctx.fillStyle = 'rgba(125, 255, 176, 0.1)';
    ctx.fillRect(cx, y + 122, 300, 128);
    ctx.strokeStyle = 'rgba(125, 255, 176, 0.6)';
    ctx.strokeRect(cx, y + 122, 300, 128);
    ctx.fillStyle = COLORS.petal;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(`${i + 1}. ${choice.label}`, cx + 150, y + 168);
    ctx.fillStyle = COLORS.hull;
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.fillText(choice.detail, cx + 150, y + 204);
  });
  ctx.textAlign = 'left';
}

function drawOver(ctx, state) {
  const { y } = panel(ctx, 620, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.brute;
  ctx.font = '800 56px system-ui, sans-serif';
  ctx.fillText('THE GARDEN FALLS', FIELD.width / 2, y + 84);
  ctx.fillStyle = COLORS.hull;
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(`Final score  ${state.score}`, FIELD.width / 2, y + 148);
  ctx.font = '500 21px system-ui, sans-serif';
  ctx.fillText(`Reached wave ${state.wave}  ·  ${state.kills} spores scattered`, FIELD.width / 2, y + 188);
  ctx.fillStyle = COLORS.bloom;
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('Press R or click to bloom again', FIELD.width / 2, y + 262);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 6, 12, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hull;
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillText('Press P to drift on', FIELD.width / 2, FIELD.height / 2 + 42);
  ctx.textAlign = 'left';
}

/** Draw one frame. `screen` is title / play / over; `paused` overlays a veil. */
export function drawFrame(ctx, state, screen, paused) {
  ctx.save();
  if (state.shake > 0.2) {
    const s = state.shake;
    ctx.translate((Math.sin(state.time * 91) * s) / 2, (Math.cos(state.time * 113) * s) / 2);
  }
  drawBackground(ctx, state);
  for (const b of state.bullets) {
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of state.enemies) drawEnemy(ctx, e, state.time);
  if (state.ship) drawShip(ctx, state.ship, state.time);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of state.texts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life));
    ctx.fillStyle = t.color;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(t.text, t.x - 14, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (screen === SCREEN_PLAY || state.phase === PHASE_UPGRADE || state.phase === PHASE_OVER) drawHud(ctx, state);
  if (screen === SCREEN_TITLE) drawTitle(ctx, state);
  if (state.phase === PHASE_UPGRADE && screen !== SCREEN_TITLE) drawUpgrade(ctx, state);
  if (screen === SCREEN_OVER || state.phase === PHASE_OVER) drawOver(ctx, state);
  if (paused) drawPaused(ctx);
}
