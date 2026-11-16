# best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/travallgar1122/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/travallgar1122/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# VOID BLOOM

VOID BLOOM is a 2D arena wave shooter that runs entirely in the browser. You pilot a lone bloomship in a dark arena while waves of living spores close in from every side. Clear a wave and the arena breathes for a moment: you pick one of two upgrades, then the next wave arrives faster, denser and angrier. Survive as long as you can, chain kills into combos, and chase a high score.

## How to play

- **Move** — WASD or the arrow keys
- **Aim** — mouse
- **Shoot** — hold the mouse button or Space
- **Dash** — Shift (a short burst with brief invulnerability, on a cooldown)
- **Pause** — P
- **Mute** — M
- Between waves, press **1** or **2** (or click) to choose your upgrade

## What is in the arena

- **Four spore kinds**, each with its own behaviour: the orange Spore drifts straight at you, the purple Weaver zig-zags as it closes, the Splitter breaks into smaller spores when destroyed, and the Brute is slow, huge and takes real punishment.
- **Upgrades between waves** — pick one of two cards after every cleared wave (damage, fire rate, dash, hull and more), so every run grows a different build.
- **Combo scoring** — kills chained close together multiply your score; letting the chain lapse drops it back down.
- **Synthesised sound** — every shot, hit, explosion and upgrade is generated live with the Web Audio API. There are no audio files.
- **No libraries, fully offline** — the whole game is hand-written HTML, CSS and JavaScript on a single canvas, with a fixed-timestep simulation and a seeded random generator, so a run plays out identically from the same seed. Open it from disk or serve it locally; it never touches the network.

## Repository layout

- `game/` — the playable game: `index.html` plus `src/` (`main.js` the loop and state machine, `world.js` the simulation, `render.js` the canvas drawing, `input.js`, `audio.js`, `config.js`, `random.js`, `shots.js` the deterministic screenshot scenes)
- `main.ts` — the hand-in program: copies the game and screenshots into the output directory and writes `dossier.json` with the vendored make.fun library
- `serve.ts` — a tiny local server for playing the game from this repo
- `screenshots/` — three real renders of the game (start, mid-wave action, game over), with `shots.json` describing how they were taken
- `tools/screenshots.mjs` — the script that produced the screenshots
- `vendor/makefun-game.ts` — the make.fun hand-in library, byte-identical to the competition kit

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a browser

# hand-in program (copies the game + screenshots and writes dossier.json):
MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=h0zvrf0h&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
