// Material binding factories. Colors are given as sRGB hex and converted to scene-linear BT.709.
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function srgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => +lin(v / 255).toFixed(5));
}

const C = (v) => ({ type: 'constant', value: v });

function binding(id, inputs, extra = {}) {
  return { id, inputs, transmissionMedium: { type: 'sheet' }, alphaMode: 'opaque', unlit: false, doubleSided: false, ...extra };
}

// Generic PBR factory: pbr({color:'#hex', metal, rough, ...}) -> (id) => binding
export function pbr({ color = '#808080', metal = 0, rough = 0.5, emissive = null, emissiveStrength = 1, sheen = null, clearcoat = null, specular = null, doubleSided = false, tex = null } = {}) {
  return (id) => {
    const inputs = { baseColor: C(srgb(color)), metallic: C(metal), roughness: C(rough) };
    if (emissive) { inputs.emissiveColor = C(srgb(emissive)); inputs.emissiveStrength = C(emissiveStrength); }
    if (sheen) { inputs.sheen = C(1); inputs.sheenColor = C(srgb(sheen)); inputs.sheenRoughness = C(0.5); }
    if (clearcoat != null) { inputs.clearcoat = C(clearcoat); inputs.clearcoatRoughness = C(0.15); }
    if (specular != null) inputs.specular = C(specular);
    if (tex) Object.assign(inputs, texInputs(tex));
    return binding(id, inputs, { doubleSided });
  };
}

// Image-texture inputs. tex = {base:'assetId', height:'assetId', heightStrength, scale:[u,v], offset:[u,v]}
function sample(assetId, kind, scale = [1, 1], offset = [0, 0]) {
  return {
    texture: { source: { type: 'image', assetId }, scale, offset, rotation: 0, minFilter: 'linear', magFilter: 'linear', mipmaps: true },
    interpretation: kind === 'color' ? { type: 'color' } : { type: 'data' },
    selection: kind === 'color' ? { type: 'rgb' } : { type: 'channel', channel: 0 },
  };
}
function texInputs({ base, height, rough, metal, heightStrength = 1, scale, offset }) {
  const o = {};
  if (metal) o.metallic = { type: 'texture', factor: 1, sample: sample(metal, 'data', scale, offset) };
  if (base) o.baseColor = { type: 'texture', factor: [1, 1, 1], sample: sample(base, 'color', scale, offset) };
  if (rough) o.roughness = { type: 'texture', factor: 1, sample: sample(rough, 'data', scale, offset) };
  if (height) { o.height = { type: 'texture', factor: 1, sample: sample(height, 'data', scale, offset) }; o.heightStrength = C(heightStrength); }
  return o;
}

export const M = {
  brass: pbr({ color: '#C89A4A', metal: 1, rough: 0.3 }),
  brassDark: pbr({ color: '#8E6A34', metal: 1, rough: 0.42 }),
  gold: pbr({ color: '#E2B060', metal: 1, rough: 0.22 }),
  copper: pbr({ color: '#B8734A', metal: 1, rough: 0.35 }),
  bronze: pbr({ color: '#4A3424', metal: 1, rough: 0.5 }),
  iron: pbr({ color: '#3A3632', metal: 1, rough: 0.55 }),
  steel: pbr({ color: '#8C8A86', metal: 1, rough: 0.35 }),
  silver: pbr({ color: '#E0DCD2', metal: 1, rough: 0.22 }),
  patina: pbr({ color: '#4F8C78', metal: 0.3, rough: 0.55 }),
  parchment: pbr({ color: '#A3967E', rough: 0.85 }),
  parchmentDark: pbr({ color: '#6E6150', rough: 0.9 }),
  water: pbr({ color: '#1C2730', rough: 0.22, specular: 0.6 }),
  slate: pbr({ color: '#2B3036', rough: 0.6 }),
  stone: pbr({ color: '#D8D0BF', rough: 0.7 }),
  stoneDark: pbr({ color: '#9A9284', rough: 0.75 }),
  wood: pbr({ color: '#4B3626', rough: 0.6 }),
  velvet: pbr({ color: '#4A0C10', rough: 0.8, sheen: '#C24A4A' }),
  lacquer: pbr({ color: '#8E2016', rough: 0.35, clearcoat: 0.6 }),
  redLeaf: pbr({ color: '#B0201A', rough: 0.4, clearcoat: 0.4 }),
  ink: pbr({ color: '#17130F', rough: 0.6 }),
  glassBlue: pbr({ color: '#3D5C74', metal: 0.6, rough: 0.15 }),
  ivory: pbr({ color: '#E9E1CF', rough: 0.55 }),
  white: pbr({ color: '#F2EEE6', rough: 0.5 }),
};

export const emissive = (color, strength = 10) => pbr({ color: '#000000', rough: 1, emissive: color, emissiveStrength: strength });
