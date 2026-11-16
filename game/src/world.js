// VOID BLOOM — the simulation. A fixed-step world holding the bloomship, its
// bullets, the spore waves, particles and floating score text. It knows nothing
// about the DOM: the game loop feeds it an input snapshot and the renderer only
// reads its state. All randomness comes from the seeded stream in random.js.

import { COMBO, DASH, FIELD, GUN, SHIP } from './config.js';
import { makeRng } from './random.js';

export const KIND_CHASER = 'chaser';
export const KIND_SPLITTER = 'splitter';
export const KIND_WEAVER = 'weaver';
export const KIND_BRUTE = 'brute';

export const PHASE_PLAY = 'play';
export const PHASE_UPGRADE = 'upgrade';
export const PHASE_OVER = 'over';

const ENEMY_TYPES = {
  [KIND_CHASER]: { radius: 16, hp: 18, speed: 118, score: 50, damage: 14 },
  [KIND_SPLITTER]: { radius: 21, hp: 26, speed: 82, score: 80, damage: 14 },
  [KIND_WEAVER]: { radius: 14, hp: 14, speed: 132, score: 70, damage: 12 },
  [KIND_BRUTE]: { radius: 34, hp: 130, speed: 52, score: 250, damage: 26 },
};

const UPGRADE_POOL = [
  { id: 'rate', label: 'Rapid Pollen', detail: 'Fire rate +22%' },
  { id: 'damage', label: 'Thorn Rounds', detail: 'Bullet damage +4' },
  { id: 'speed', label: 'Swift Roots', detail: 'Move speed +12%' },
  { id: 'hull', label: 'Thick Bark', detail: 'Max HP +25 and heal 25' },
  { id: 'multi', label: 'Twin Bloom', detail: '+1 bullet per shot' },
  { id: 'dash', label: 'Quick Gust', detail: 'Dash recharges 30% faster' },
];

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const state = {
    time: 0,
    phase: PHASE_PLAY,
    wave: 0,
    score: 0,
    kills: 0,
    combo: 1,
    comboTimer: 0,
    shake: 0,
    ship: null,
    bullets: [],
    enemies: [],
    particles: [],
    texts: [],
    toSpawn: [],
    spawnTimer: 0,
    upgradeChoices: [],
    events: [],
  };

  function freshShip() {
    return {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      hp: SHIP.hp,
      maxHp: SHIP.hp,
      aim: 0,
      fireTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnTimer: 0,
      muzzle: 0,
      stats: { cooldown: GUN.cooldown, damage: GUN.damage, speed: 1, shots: 1, dashScale: 1 },
    };
  }

  function spawnEnemy(kind, x, y, scale) {
    const base = ENEMY_TYPES[kind];
    const hpScale = (scale ?? 1) * (1 + (state.wave - 1) * 0.13);
    state.enemies.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: base.radius * (kind === KIND_SPLITTER && scale ? scale : 1),
      hp: base.hp * hpScale,
      maxHp: base.hp * hpScale,
      speed: base.speed * rng.range(0.88, 1.12),
      score: base.score,
      damage: base.damage,
      seedPhase: rng.angle(),
      flash: 0,
      age: 0,
    });
  }

  /** Build the spawn queue for a wave: more spores, nastier mixes, as it climbs. */
  function planWave(n) {
    const queue = [];
    const chasers = 4 + n * 2;
    const splitters = n >= 2 ? 1 + n : 0;
    const weavers = n >= 2 ? n + 1 : 0;
    const brutes = n >= 3 ? Math.floor((n - 1) / 2) : 0;
    for (let i = 0; i < chasers; i += 1) queue.push(KIND_CHASER);
    for (let i = 0; i < splitters; i += 1) queue.push(KIND_SPLITTER);
    for (let i = 0; i < weavers; i += 1) queue.push(KIND_WEAVER);
    for (let i = 0; i < brutes; i += 1) queue.push(KIND_BRUTE);
    // Shuffle with the seeded stream so the mix arrives interleaved.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    return queue;
  }

  function startWave() {
    state.wave += 1;
    state.toSpawn = planWave(state.wave);
    state.spawnTimer = 0.4;
    state.events.push({ type: 'wave', wave: state.wave });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.angle();
      const s = rng.range(speed * 0.25, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.range(0.25, 0.6),
        maxLife: 0.6,
        size: rng.range(1.6, 3.8),
        color,
      });
    }
  }

  function addText(x, y, text, color) {
    state.texts.push({ x, y, text, color, life: 0.9 });
  }

  function killEnemy(enemy) {
    state.kills += 1;
    state.comboTimer = COMBO.windowSeconds;
    const gained = enemy.score * state.combo;
    state.score += gained;
    addText(enemy.x, enemy.y - enemy.radius, `+${gained}`, '#d8ffe9');
    state.combo = Math.min(COMBO.maxMultiplier, state.combo + 1);
    burst(enemy.x, enemy.y, enemy.kind === KIND_BRUTE ? '#ff5c7a' : '#ffb35c', enemy.kind === KIND_BRUTE ? 30 : 14, 260);
    state.shake = Math.min(14, state.shake + (enemy.kind === KIND_BRUTE ? 9 : 3.5));
    state.events.push({ type: 'explode', big: enemy.kind === KIND_BRUTE });
    if (enemy.kind === KIND_SPLITTER && enemy.radius > 15) {
      for (let i = 0; i < 2; i += 1) {
        const a = rng.angle();
        spawnEnemy(KIND_CHASER, enemy.x + Math.cos(a) * 14, enemy.y + Math.sin(a) * 14, 0.55);
        const child = state.enemies[state.enemies.length - 1];
        child.radius = 10;
        child.hp = 8;
        child.maxHp = 8;
        child.score = 30;
        child.speed = 165;
      }
    }
  }

  function hurtShip(amount) {
    const ship = state.ship;
    if (ship.invulnTimer > 0 || ship.dashTimer > 0) return;
    ship.hp -= amount;
    ship.invulnTimer = SHIP.invulnSeconds;
    state.shake = Math.min(16, state.shake + 7);
    state.combo = 1;
    state.comboTimer = 0;
    state.events.push({ type: 'hurt' });
    burst(ship.x, ship.y, '#ff5c7a', 16, 240);
    if (ship.hp <= 0) {
      ship.hp = 0;
      state.phase = PHASE_OVER;
      state.events.push({ type: 'over' });
      burst(ship.x, ship.y, '#7dffb0', 46, 340);
    }
  }

  function applyUpgrade(choice) {
    const ship = state.ship;
    if (choice.id === 'rate') ship.stats.cooldown *= 0.82;
    if (choice.id === 'damage') ship.stats.damage += 4;
    if (choice.id === 'speed') ship.stats.speed *= 1.12;
    if (choice.id === 'hull') {
      ship.maxHp += 25;
      ship.hp = Math.min(ship.maxHp, ship.hp + 25);
    }
    if (choice.id === 'multi') ship.stats.shots += 1;
    if (choice.id === 'dash') ship.stats.dashScale *= 0.7;
    state.events.push({ type: 'upgrade' });
    state.phase = PHASE_PLAY;
    startWave();
  }

  function offerUpgrades() {
    const first = Math.floor(rng.next() * UPGRADE_POOL.length);
    let second = Math.floor(rng.next() * UPGRADE_POOL.length);
    if (second === first) second = (second + 1) % UPGRADE_POOL.length;
    state.upgradeChoices = [UPGRADE_POOL[first], UPGRADE_POOL[second]];
    state.phase = PHASE_UPGRADE;
    state.events.push({ type: 'waveClear' });
  }

  /** Advance the world one fixed step. `input` is the snapshot from input.js. */
  function step(dt, input) {
    state.time += dt;
    state.events.length = 0;
    const ship = state.ship;
    if (state.phase !== PHASE_PLAY) return;

    // Timers.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    ship.fireTimer -= dt;
    ship.dashCooldown -= dt;
    ship.invulnTimer -= dt;
    ship.muzzle = Math.max(0, ship.muzzle - dt * 9);
    state.shake = Math.max(0, state.shake - dt * 34);

    // Spawning: one spore at a time from a random edge, away from the ship.
    if (state.toSpawn.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = Math.max(0.28, 0.85 - state.wave * 0.05);
        const kind = state.toSpawn.shift();
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 8; tries += 1) {
          const edge = rng.int(0, 3);
          x = edge === 0 ? 30 : edge === 1 ? FIELD.width - 30 : rng.range(40, FIELD.width - 40);
          y = edge === 2 ? 30 : edge === 3 ? FIELD.height - 30 : rng.range(40, FIELD.height - 40);
          if (dist2(x, y, ship.x, ship.y) > 260 * 260) break;
        }
        spawnEnemy(kind, x, y);
      }
    } else if (state.enemies.length === 0) {
      offerUpgrades();
      return;
    }

    // Movement: dash overrides normal thrust while it lasts.
    const move = input.move;
    if (input.dash && ship.dashCooldown <= 0 && ship.dashTimer <= 0) {
      ship.dashTimer = DASH.duration;
      ship.dashCooldown = DASH.cooldown * ship.stats.dashScale;
      const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(ship.aim);
      const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(ship.aim);
      ship.vx = dx * DASH.speed;
      ship.vy = dy * DASH.speed;
      state.events.push({ type: 'dash' });
    }
    if (ship.dashTimer > 0) {
      ship.dashTimer -= dt;
    } else {
      ship.vx += move.x * SHIP.accel * dt;
      ship.vy += move.y * SHIP.accel * dt;
      const damp = Math.max(0, 1 - SHIP.friction * dt);
      ship.vx *= damp;
      ship.vy *= damp;
      const speed = Math.hypot(ship.vx, ship.vy);
      const cap = SHIP.maxSpeed * ship.stats.speed;
      if (speed > cap) {
        ship.vx = (ship.vx / speed) * cap;
        ship.vy = (ship.vy / speed) * cap;
      }
    }
    ship.x = Math.min(FIELD.width - SHIP.radius, Math.max(SHIP.radius, ship.x + ship.vx * dt));
    ship.y = Math.min(FIELD.height - SHIP.radius, Math.max(SHIP.radius, ship.y + ship.vy * dt));
    ship.aim = Math.atan2(input.aimY - ship.y, input.aimX - ship.x);

    // Firing: a fan of bullets centred on the aim direction.
    if (input.firing && ship.fireTimer <= 0) {
      ship.fireTimer = ship.stats.cooldown;
      ship.muzzle = 1;
      const shots = ship.stats.shots;
      for (let i = 0; i < shots; i += 1) {
        const offset = (i - (shots - 1) / 2) * 0.09;
        const a = ship.aim + offset + rng.range(-GUN.spread, GUN.spread);
        state.bullets.push({
          x: ship.x + Math.cos(ship.aim) * (SHIP.radius + 6),
          y: ship.y + Math.sin(ship.aim) * (SHIP.radius + 6),
          vx: Math.cos(a) * GUN.bulletSpeed,
          vy: Math.sin(a) * GUN.bulletSpeed,
          life: GUN.bulletLife,
        });
      }
      state.events.push({ type: 'shoot' });
    }

    // Bullets.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
      }
    }

    // Enemies: each kind steers its own way toward the ship.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt * 8);
      const dx = ship.x - e.x;
      const dy = ship.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let tx = (dx / d) * e.speed;
      let ty = (dy / d) * e.speed;
      if (e.kind === KIND_WEAVER) {
        const sway = Math.sin(e.age * 3.4 + e.seedPhase) * 0.75;
        const px = (-dy / d) * sway * e.speed;
        const py = (dx / d) * sway * e.speed;
        tx += px;
        ty += py;
      }
      e.vx += (tx - e.vx) * Math.min(1, dt * 3.2);
      e.vy += (ty - e.vy) * Math.min(1, dt * 3.2);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Bullet hits.
      for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
        const b = state.bullets[j];
        if (dist2(b.x, b.y, e.x, e.y) < (e.radius + GUN.bulletRadius) ** 2) {
          state.bullets.splice(j, 1);
          e.hp -= ship.stats.damage;
          e.flash = 1;
          state.events.push({ type: 'hit' });
          burst(b.x, b.y, '#d8ffe9', 3, 150);
          if (e.hp <= 0) {
            killEnemy(e);
            state.enemies.splice(i, 1);
          }
          break;
        }
      }
      if (!state.enemies.includes(e)) continue;

      // Contact with the ship.
      if (dist2(e.x, e.y, ship.x, ship.y) < (e.radius + SHIP.radius) ** 2) {
        hurtShip(e.damage);
        e.hp -= 30;
        if (e.hp <= 0) {
          killEnemy(e);
          state.enemies.splice(i, 1);
        }
      }
    }

    // Particles and floating text always drift on.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.texts.length - 1; i >= 0; i -= 1) {
      const t = state.texts[i];
      t.y -= 44 * dt;
      t.life -= dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
  }

  function reset() {
    state.time = 0;
    state.phase = PHASE_PLAY;
    state.wave = 0;
    state.score = 0;
    state.kills = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 0;
    state.ship = freshShip();
    state.bullets = [];
    state.enemies = [];
    state.particles = [];
    state.texts = [];
    state.toSpawn = [];
    state.upgradeChoices = [];
    state.events = [];
    startWave();
  }

  reset();
  return { state, step, reset, applyUpgrade, burst };
}
