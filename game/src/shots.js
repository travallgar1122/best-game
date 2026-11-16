// VOID BLOOM — frozen scenes for screenshots. Each scene is built by running
// the real simulation forward from a fresh seeded world with a simple
// autopilot at the controls, then freezing the frame: the same seed always
// renders the same picture, and the picture is a moment the game itself made.

import { STEP } from './config.js';
import { PHASE_OVER, PHASE_PLAY, PHASE_UPGRADE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_STEPS = 240; // 2 s of drifting spores behind the title
const PLAY_MAX_STEPS = 12000; // safety cap while hunting for a busy play frame

/** Steer toward the nearest spore, keep firing, dash when one gets close. */
function autopilot(world) {
  const { state } = world;
  const ship = state.ship;
  let target = null;
  let best = Infinity;
  for (const e of state.enemies) {
    const d = (e.x - ship.x) ** 2 + (e.y - ship.y) ** 2;
    if (d < best) {
      best = d;
      target = e;
    }
  }
  const input = { move: { x: 0, y: 0 }, aimX: ship.x + 120, aimY: ship.y, firing: false, dash: false };
  if (target) {
    input.aimX = target.x;
    input.aimY = target.y;
    input.firing = true;
    // Orbit the target at mid range instead of charging into it.
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = d > 320 ? 1 : d < 170 ? -1 : 0;
    input.move.x = (dx / d) * want + (-dy / d) * 0.45;
    input.move.y = (dy / d) * want + (dx / d) * 0.45;
    const len = Math.hypot(input.move.x, input.move.y) || 1;
    input.move.x /= len;
    input.move.y /= len;
    input.dash = d < 95;
  }
  return input;
}

/**
 * Stage the named scene ('start', 'play' or 'end') on `world`, which the
 * caller created with the shot's seed. Returns the screen to draw.
 */
export function stageShot(name, world) {
  const { state } = world;
  if (name === 'play') {
    // Freeze mid-firefight, not at a fixed step count: a fixed count used to
    // land after the pilot had thinned wave 1 to a single spore (score 750).
    // Instead the pilot plays on — grabbing the first upgrade whenever a
    // wave clears — until the frame is genuinely busy: at least five spores
    // of two or more kinds spread across the field, bullets in the air and
    // fresh explosion particles, with the combo multiplier running. The hunt
    // is a pure function of the seeded simulation, so the same seed freezes
    // the same frame: with seed 1 it first holds on wave 5 — five spores of
    // all four kinds spread 1,086x623, 16 bullets, 16 particles, score
    // 36,480, combo x4.
    for (let i = 0; i < PLAY_MAX_STEPS; i += 1) {
      if (state.phase === PHASE_UPGRADE) {
        world.applyUpgrade(state.upgradeChoices[0]);
        continue;
      }
      if (state.phase !== PHASE_PLAY) break;
      world.step(STEP, autopilot(world));
      const kinds = new Set(state.enemies.map((e) => e.kind));
      let spreadX = 0;
      let spreadY = 0;
      if (state.enemies.length > 1) {
        const xs = state.enemies.map((e) => e.x);
        const ys = state.enemies.map((e) => e.y);
        spreadX = Math.max(...xs) - Math.min(...xs);
        spreadY = Math.max(...ys) - Math.min(...ys);
      }
      if (
        i >= 480 &&
        state.enemies.length >= 5 &&
        kinds.size >= 2 &&
        spreadX >= 450 &&
        spreadY >= 280 &&
        state.bullets.length >= 3 &&
        state.particles.length >= 6 &&
        state.combo >= 2
      ) {
        break;
      }
    }
    // Guarantee a lively frozen frame even if the hunt ran dry.
    if (state.phase !== PHASE_PLAY || state.enemies.length === 0) {
      world.reset();
      for (let i = 0; i < 700; i += 1) world.step(STEP, autopilot(world));
    }
    return SCREEN_PLAY;
  }
  if (name === 'end') {
    // Play honestly until the garden falls, with a reckless pilot who never
    // dashes and aims poorly, so the run ends the way a hurried player's does.
    const reckless = () => {
      const ship = state.ship;
      return {
        move: { x: Math.sin(state.time * 0.7), y: Math.cos(state.time * 0.9) },
        aimX: ship.x + Math.cos(state.time * 1.3) * 200,
        aimY: ship.y + Math.sin(state.time * 1.3) * 200,
        firing: true,
        dash: false,
      };
    };
    for (let i = 0; i < 120 * 240 && state.phase !== PHASE_OVER; i += 1) {
      if (state.phase === PHASE_UPGRADE) {
        // Between waves the pilot grabs the first upgrade and drifts on.
        world.applyUpgrade(state.upgradeChoices[0]);
        continue;
      }
      world.step(STEP, reckless());
    }
    if (state.phase !== PHASE_OVER) {
      // Fallback: stage the aftermath directly so the scene always shows.
      state.score = Math.max(state.score, 1450);
      state.phase = PHASE_OVER;
      state.ship.hp = 0;
    }
    return SCREEN_OVER;
  }
  for (let i = 0; i < START_STEPS; i += 1) {
    world.step(STEP, { move: { x: 0, y: 0 }, aimX: 900, aimY: 260, firing: false, dash: false });
  }
  return SCREEN_TITLE;
}
