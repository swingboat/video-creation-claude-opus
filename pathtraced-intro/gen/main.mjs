// Assemble action batches: node gen/main.mjs [outDir] [shotKey...]
// Writes one JSON batch per shot (+ credits) so each applies atomically. Optional shot filter for dev builds.
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const outDir = process.argv[2] || `${root}build/actions`;
const only = process.argv.slice(3);
mkdirSync(outDir, { recursive: true });

const shotFiles = readdirSync(`${root}gen/shots`).filter((f) => f.endsWith('.mjs')).sort();
const shots = [];
for (const f of shotFiles) shots.push((await import(`./shots/${f}`)).default);

// Later-created layers are inserted on top; build scenes from last to first so S01 ends at the bottom of the stack.
let n = 0;
for (const s of shots.slice().reverse()) {
  if (only.length && !only.includes(s.key)) continue;
  const acts = s.build();
  const file = `${outDir}/${String(++n).padStart(2, '0')}-${s.key}.json`;
  writeFileSync(file, JSON.stringify(acts));
  console.log(file.replace(root, ''), acts.length, 'actions');
}
try {
  const credits = (await import('./credits.mjs')).default;
  if (!only.length || only.includes('credits')) {
    const file = `${outDir}/${String(++n).padStart(2, '0')}-credits.json`;
    writeFileSync(file, JSON.stringify(credits()));
    console.log(file.replace(root, ''));
  }
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}
