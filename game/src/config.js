// VOID BLOOM — tuning constants. Every number that shapes how a run feels lives
// here so the rest of the code can stay about behaviour, not magic values.

export const FIELD = { width: 1280, height: 800 };

export const SHIP = {
  radius: 15,
  accel: 2400,
  maxSpeed: 335,
  friction: 5.2,
  hp: 100,
  contactDamage: 16,
  invulnSeconds: 0.85,
};

export const GUN = {
  cooldown: 0.155,
  bulletSpeed: 780,
  bulletLife: 0.85,
  bulletRadius: 4,
  damage: 9,
  spread: 0.045,
};

export const DASH = {
  speed: 1180,
  duration: 0.16,
  cooldown: 1.7,
};

export const COMBO = { windowSeconds: 2, maxMultiplier: 8 };

export const STEP = 1 / 120;

export const COLORS = {
  void: '#05070f',
  bloom: '#7dffb0',
  petal: '#ff7dd1',
  spore: '#ffb35c',
  weaver: '#c792ff',
  brute: '#ff5c7a',
  bullet: '#d8ffe9',
  hull: '#eafff2',
};
