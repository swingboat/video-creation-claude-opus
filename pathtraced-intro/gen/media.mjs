// Add Image (credit icons) and Audio (music) layers to a checked-out document: node gen/media.mjs doc.json [musicMs]
import { readFileSync, writeFileSync } from 'node:fs';
import { BLOCKS } from './credits.mjs';

const [file, musicMs = '38200'] = process.argv.slice(2);
const doc = JSON.parse(readFileSync(file, 'utf8'));
const layers = doc.composition.layers;
const groups = layers.filter((l) => l.type === 'Group' && /^Credits \d+$/.test(l.name));
let id = 900;
BLOCKS.forEach((b, i) => {
  const g = groups.find((l) => l.name === `Credits ${i + 1}`);
  if (!g) throw new Error(`missing group Credits ${i + 1}`);
  g.layers = (g.layers || []).filter((l) => l.type !== 'Image');
  g.layers.push({ type: 'Image', id: ++id, name: 'Credit icon', activeRange: { start: 0, duration: b.dur }, transform: { anchorPoint: [32, 32], position: b.icon, scale: [62, 62], rotation: 0, opacity: 90 }, source: { assetId: 'credit_icon', fit: 'contain' } });
});
const dur = +musicMs;
doc.composition.layers = layers.filter((l) => l.type !== 'Audio');
doc.composition.layers.push({
  id: 990, name: 'Music', type: 'Audio',
  playback: { type: 'windowed', inputRange: { start: 0, duration: dur }, mapping: { type: 'linear', input: { start: 0, duration: dur }, output: { start: 0, duration: dur } }, inputOffsetMs: 0 },
  sourceRange: { start: 0, duration: dur }, sourceIntrinsicDuration: dur,
  source: { assetId: 'music' }, volume: 1.0, captionsEnabled: false,
});
writeFileSync(file, JSON.stringify(doc));
console.log('media layers added: icons', BLOCKS.length, '+ music');
