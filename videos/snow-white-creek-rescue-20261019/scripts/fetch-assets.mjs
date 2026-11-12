// Download CC0 environment assets from Poly Haven into public/assets and write a provenance manifest.
// Usage: node scripts/fetch-assets.mjs   (idempotent; skips files that already exist with matching size)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets');
const API = 'https://api.polyhaven.com';

// What the film uses. Resolution chosen per role to keep the bundle light.
const MODELS = {
  // vegetation & ground clutter
  fern_02: '1k', shrub_01: '1k', shrub_02: '1k', shrub_04: '1k', nettle_plant: '1k', grass_medium_01: '1k',
  moss_01: '1k', celandine_01: '1k', dandelion_01: '1k', periwinkle_plant: '1k',
  // trees, roots, logs, rocks
  dead_tree_trunk: '2k', dead_tree_trunk_02: '2k', tree_stump_01: '1k', root_cluster_01: '1k', root_cluster_02: '1k', pine_roots: '1k',
  fir_tree_01: '1k', pine_tree_01: '1k', rock_moss_set_01: '1k', rock_moss_set_02: '1k', boulder_01: '2k', bark_debris_01: '1k',
  dry_branches_medium_01: '1k',
  // props
  food_apple_01: '1k', wicker_basket_01: '1k', Lantern_01: '1k', wooden_axe: '1k', handsaw_wood: '1k', wooden_bucket_01: '1k',
};
const TEXTURES = {
  forest_ground_04: '2k', forest_leaves_02: '2k', mossy_rock: '1k', river_small_rocks: '2k', mud_forest: '1k',
  bark_brown_02: '1k', pine_bark: '1k', moss_wood: '1k',
  rough_linen: '1k', velour_velvet: '1k', wool_boucle: '1k', cotton_jersey: '1k', brown_leather: '1k', fabric_leather_02: '1k',
  weathered_planks: '1k', raw_plank_wall: '1k',
};
const HDRIS = { monbachtal_riverbank: '2k', mossy_forest: '2k', sunset_forest: '2k', misty_pines: '2k' };

const manifest = { source: 'Poly Haven (https://polyhaven.com)', license: 'CC0 1.0 Universal', fetchedAt: new Date().toISOString(), assets: [] };

async function json(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error('fetch failed ' + url);
}
async function download(url, dest, size) {
  if (fs.existsSync(dest) && (!size || fs.statSync(dest).size === size)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      return;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}
async function info(id) {
  const d = await json(`${API}/info/${id}`);
  return { id, name: d.name, authors: d.authors, url: `https://polyhaven.com/a/${id}` };
}

async function model(id, res) {
  const f = await json(`${API}/files/${id}`);
  const g = f.gltf[res]?.gltf ?? f.gltf['1k'].gltf;
  const dir = path.join(OUT, 'models', id);
  await download(g.url, path.join(dir, `${id}.gltf`), g.size);
  for (const [rel, x] of Object.entries(g.include)) await download(x.url, path.join(dir, rel), x.size);
  manifest.assets.push({ type: 'model', res, ...(await info(id)) });
  console.log('model', id);
}
async function texture(id, res) {
  const f = await json(`${API}/files/${id}`);
  const dir = path.join(OUT, 'textures', id);
  const pick = (k) => f[k]?.[res]?.jpg ?? f[k]?.['1k']?.jpg;
  const maps = { diff: pick('Diffuse'), nor: pick('nor_gl'), rough: pick('Rough'), arm: pick('arm'), disp: pick('Displacement') };
  for (const [k, x] of Object.entries(maps)) if (x && k !== 'disp') await download(x.url, path.join(dir, `${k}.jpg`), x.size);
  manifest.assets.push({ type: 'texture', res, ...(await info(id)) });
  console.log('texture', id);
}
async function hdri(id, res) {
  const f = await json(`${API}/files/${id}`);
  const x = f.hdri[res].hdr;
  await download(x.url, path.join(OUT, 'hdri', `${id}.hdr`), x.size);
  manifest.assets.push({ type: 'hdri', res, ...(await info(id)) });
  console.log('hdri', id);
}

for (const [id, r] of Object.entries(HDRIS)) await hdri(id, r);
for (const [id, r] of Object.entries(TEXTURES)) await texture(id, r);
for (const [id, r] of Object.entries(MODELS)) await model(id, r);
fs.writeFileSync(path.join(ROOT, 'docs/assets-polyhaven.json'), JSON.stringify(manifest, null, 2));
console.log('✓ manifest docs/assets-polyhaven.json', manifest.assets.length, 'assets');
