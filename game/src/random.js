// VOID BLOOM — seeded randomness. One mulberry32 stream drives every spawn,
// drift and scatter in the game, so a given seed always grows the same garden
// of spores. Nothing in the game calls Math.random.

/** Create a mulberry32 generator from a 32-bit seed. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small helper wrapper: float ranges, int ranges, angles and picks. */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    angle: () => next() * Math.PI * 2,
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}
