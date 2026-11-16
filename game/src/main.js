// VOID BLOOM — the game loop and screen flow. Owns the canvas, the fixed-step
// accumulator, and the transitions between title, play, upgrade choice, pause
// and game over. In screenshot mode (?shot=...) it stages one frozen scene,
// draws it once and flags readiness instead of running the loop.

import { FIELD, STEP } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, PHASE_OVER, PHASE_PLAY, PHASE_UPGRADE } from './world.js';
import { drawFrame, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.style.width = `${FIELD.width * scale}px`;
  canvas.style.height = `${FIELD.height * scale}px`;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

function toField(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * FIELD.width,
    y: ((clientY - rect.top) / rect.height) * FIELD.height,
  };
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const audio = createAudio();
const world = createWorld(seed * 7919 + 13);

if (shotName) {
  const screen = stageShot(shotName, world);
  drawFrame(ctx, world.state, screen, false);
  window.__shotReady = true;
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas, toField);
  let screen = SCREEN_TITLE;
  let paused = false;
  let last = performance.now();
  let acc = 0;

  function playEvents() {
    for (const ev of world.state.events) {
      if (ev.type === 'shoot') audio.shoot();
      else if (ev.type === 'hit') audio.hit();
      else if (ev.type === 'explode') audio.explode(ev.big);
      else if (ev.type === 'hurt') audio.hurt();
      else if (ev.type === 'dash') audio.dash();
      else if (ev.type === 'waveClear') audio.waveClear();
      else if (ev.type === 'upgrade') audio.upgrade();
      else if (ev.type === 'over') audio.gameOver();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    const s = input.state;

    if (s.muteQueued) {
      audio.toggleMute();
      status.textContent = audio.muted ? 'Sound off' : 'Sound on';
    }

    if (screen === SCREEN_TITLE) {
      if (s.confirmQueued) {
        audio.unlock();
        world.reset();
        screen = SCREEN_PLAY;
        status.textContent = 'Wave 1 — good luck, gardener';
      }
    } else if (world.state.phase === PHASE_OVER) {
      screen = SCREEN_OVER;
      if (s.restartQueued || s.confirmQueued) {
        world.reset();
        screen = SCREEN_PLAY;
      }
    } else if (world.state.phase === PHASE_UPGRADE) {
      if (s.upgradeQueued === 1 || s.upgradeQueued === 2) {
        const choice = world.state.upgradeChoices[s.upgradeQueued - 1];
        if (choice) world.applyUpgrade(choice);
      }
    } else if (screen === SCREEN_PLAY) {
      if (s.pauseQueued) paused = !paused;
      if (!paused) {
        acc += dt;
        const move = input.moveVector();
        while (acc >= STEP) {
          world.step(STEP, {
            move,
            aimX: s.aimX,
            aimY: s.aimY,
            firing: input.firing(),
            dash: s.dashQueued,
          });
          // Play this step's sounds now: the next step clears the event list.
          playEvents();
          s.dashQueued = false;
          acc -= STEP;
          if (world.state.phase !== PHASE_PLAY) {
            acc = 0;
            break;
          }
        }
      }
    }

    drawFrame(ctx, world.state, screen, paused && screen === SCREEN_PLAY);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
