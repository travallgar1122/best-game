// VOID BLOOM — hand-in program for the best-game-01 bounty (Node 22, standard
// library only, no build step).
//
// What it does, in order:
//   1. Works out where the entry lives (the folder beside this file) and where
//      the output goes: $MAKEFUN_OUTPUT_DIR when set, else /output, which is
//      where the grader expects it.
//   2. Copies the whole game/ tree — the static files a desktop browser plays
//      offline, starting at game/index.html — into the output, and does the
//      same for screenshots/ (the maker's renders of the game) when present.
//   3. Writes dossier.json beside them with buildDossier from the vendored
//      make.fun library (vendor/makefun-game.ts, the kit's byte-identical
//      copy). The dossier is the summary the AI judge reads: the game's
//      source outline plus its screenshots, capped exactly as the scorer
//      caps them, so a dossier written here is the dossier the scorer
//      rebuilds and compares byte for byte.
//
// Run it locally the same way the grader does, just pointed at a scratch dir:
//   mkdir -p out-test && MAKEFUN_OUTPUT_DIR=out-test node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game always ships; screenshots join it when the folder exists (it is
// created with the entry, and filled with real renders before submitting).
mkdirSync(outputDir, { recursive: true });
cpSync(join(entryDir, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(entryDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): at most 160 KiB of
// source text in the dossier, at most 4 screenshots of at most 256 KiB each,
// and a game tree of at most 993 entries, 48 MiB in all, no path over
// 1,000 bytes. Passing them here makes this program refuse exactly what the
// scorer would refuse, instead of handing in an entry that cannot score.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`void bloom handed in: dossier.json ${dossier.length} bytes -> ${outputDir}`);
