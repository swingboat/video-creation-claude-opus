// Action builders for the Tesseract Scene3D wire format (tsrct 0.5.0, fxSchemaVersion 86).
export const COMP = 'main';

export function idSpace(shotNo) {
  let n = shotNo * 10000;
  return { next: () => ++n, layerId: 100 + shotNo };
}

const euler = (r = [0, 0, 0]) => ({ type: 'euler', order: 'XYZ', orientation: [0, 0, 0], rotationX: r[0], rotationY: r[1], rotationZ: r[2] });

export function xform({ pos = [0, 0, 0], rot = [0, 0, 0], scale = [100, 100, 100], anchor = [0, 0, 0] } = {}) {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return { position: pos, rotation: euler(rot), scale: s, anchorPoint: anchor };
}

export function sceneLayer({ layerId, name, start, dur, ids, bg = [0, 0, 0], ambient = 0.03, exposure = 0 }) {
  const worldId = ids.next();
  return [
    {
      type: 'createFxScene3DLayer', compositionId: COMP, layerId, name, pixelsPerMeter: 100,
      view: { id: ids.next(), exposure },
      activeRange: { start, duration: dur },
      transform: { anchorPoint: [0, 0], position: [0, 0], scale: [100, 100], rotation: 0, opacity: 100 },
      world: { id: worldId },
      renderSettings: { id: ids.next(), filmGate: null, overscan: null, lightGroups: [], lightCollections: [], lightLinks: [], outputs: [], previewOutput: null },
    },
    {
      type: 'setFxScene3DWorld', compositionId: COMP, layerId,
      world: { id: worldId, background: { type: 'color', color: [...bg, 1] }, light: { source: { type: 'color', color: [1, 0.85, 0.65, 1] }, intensity: ambient, integration: 'sampled' } },
    },
  ];
}

// Physical-lens camera aimed at a world point. Returns ids so shots can animate pos / aim target offset.
export function camera({ layerId, ids, pos, target, focal = 35, fNumber = null, focusDist = null, roll = 0, up = null, name = 'Camera' }) {
  const camId = ids.next(), aimId = ids.next(), tgtId = ids.next();
  up = up || [Math.sin(roll * Math.PI / 180), Math.cos(roll * Math.PI / 180), 0];
  const item = {
    type: 'Camera3D', id: camId, parentId: null, name,
    transform: { position: pos, relationships: { constraints: [{ type: 'aim', id: aimId, target: { id: tgtId, target: { type: 'world' }, offset: target, offsetSpace: 'local' }, up, upSpace: 'world', forwardAxis: 'positiveZ', influence: 1 }] } },
    lens: { type: 'physical', focalLengthMm: focal, sensorMm: [36, 24], fNumber: fNumber ?? 16 },
  };
  // Depth of field follows the aim target unless a fixed focus distance is given.
  if (fNumber) item.depthOfField = focusDist ? { focusDistance: focusDist } : { focusDistance: 1000, focusAim: { constraintId: aimId } };
  const actions = [
    { type: 'addFxScene3DLayer', compositionId: COMP, layerId, item },
    { type: 'setFxScene3DActiveCamera', compositionId: COMP, layerId, cameraItemId: camId },
  ];
  return { actions, camId, aimId, tgtId };
}

export function light({ layerId, ids, kind = 'point', pos = [0, 0, 0], target = null, power = 1000, color = [1, 0.8, 0.55], radius = 20, cone = 40, feather = 0.3, irradiance = 3, rot = [0, 0, 0], areaSize = [200, 200], name = 'Light', shadows = true }) {
  const id = ids.next();
  let emitter;
  if (kind === 'point') emitter = { type: 'point', power, sourceRadius: radius };
  else if (kind === 'spot') emitter = { type: 'spot', power, coneAngle: cone, coneFeather: feather, sourceRadius: radius };
  else if (kind === 'parallel') emitter = { type: 'parallel', irradiance };
  else emitter = { type: 'area', power, shape: { type: 'rectangle', areaSize } };
  const transform = { position: pos, rotation: euler(rot) };
  if (target) {
    transform.relationships = { constraints: [{ type: 'aim', id: ids.next(), target: { id: ids.next(), target: { type: 'world' }, offset: target, offsetSpace: 'local' }, up: [0, 1, 0], upSpace: 'world', forwardAxis: 'positiveZ', influence: 1 }] };
    delete transform.rotation;
  }
  const item = { type: 'Light3D', id, parentId: null, name, transform, emitter, color: [...color, 1], castsShadows: shadows };
  return { action: { type: 'addFxScene3DLayer', compositionId: COMP, layerId, item }, id };
}

export const meshData = (id, geometry, name = 'Geo') => ({ type: 'mesh', id, name, geometry, regions: [{ key: 'primary', name: 'Primary' }, { key: 'side', name: 'Side' }] });

// mat: a binding factory (id) => binding, from mat.mjs. sideMat optional for extrudes.
export function meshItem({ ids, id = ids.next(), dataId, name = 'Mesh', parent = null, mat, sideMat = null, modifiers = null, shadows = true, ...t }) {
  const s1 = ids.next();
  const slots = [{ id: s1, name: 'Finish', binding: mat(ids.next()) }];
  let regionSlots = [{ region: 'primary', slotId: s1 }, { region: 'side', slotId: s1 }];
  let packing = 'whole';
  if (sideMat) {
    const s2 = ids.next();
    slots.push({ id: s2, name: 'Side', binding: sideMat(ids.next()) });
    regionSlots = [{ region: 'primary', slotId: s1 }, { region: 'side', slotId: s2 }];
    packing = 'regions';
  }
  const item = { type: 'Mesh3D', id, parentId: parent, name, dataId, packing, transform: xform(t), materialSlots: slots, regionSlots, castsShadows: shadows };
  if (modifiers) item.modifiers = modifiers;
  return item;
}

export const group = ({ ids, id = ids.next(), name = 'Group', parent = null, array = null, ...t }) => {
  const g = { type: 'Group3D', id, parentId: parent, name, transform: xform(t) };
  if (array) g.array = array;
  return g;
};

export const fragment = (layerId, data, items) => ({ type: 'addFxScene3DFragment', compositionId: COMP, layerId, data, items });

// Convenience: one mesh = data + item in a list pair.
export function mesh(ids, geometry, opts) {
  const dataId = ids.next();
  const item = meshItem({ ids, dataId, ...opts });
  return { data: meshData(dataId, geometry, opts.name), item };
}

export function textData({ id, text, font, style = 'Regular', size = 100, depth = 10, bevel = null, tracking = null }) {
  const d = { type: 'text', id, name: 'Type', text, fontFamily: font, fontStyle: style, fontSize: size, depth, regions: [{ key: 'front', name: 'Front' }, { key: 'back', name: 'Back' }, { key: 'side', name: 'Side' }] };
  if (bevel) { d.bevelSize = bevel; d.bevelSegments = 2; }
  if (tracking != null) d.tracking = tracking;
  return d;
}

export function textItem({ ids, id = ids.next(), dataId, name = 'Text', parent = null, mat, sideMat = null, ...t }) {
  const f = ids.next(), s = ids.next();
  return {
    type: 'Text3D', id, parentId: parent, name, dataId, transform: xform(t),
    materialSlots: [{ id: f, name: 'Front', binding: mat(ids.next()) }, { id: s, name: 'Side', binding: (sideMat || mat)(ids.next()) }],
    regionSlots: [{ region: 'front', slotId: f }, { region: 'back', slotId: s }, { region: 'side', slotId: s }],
  };
}

const EASE = {
  linear: { type: 'linear' },
  hold: { type: 'hold' },
  inOut: { type: 'cubicBezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  out: { type: 'cubicBezier', x1: 0.2, y1: 0.6, x2: 0.35, y2: 1 },
  in: { type: 'cubicBezier', x1: 0.55, y1: 0, x2: 0.85, y2: 0.4 },
  soft: { type: 'cubicBezier', x1: 0.3, y1: 0.1, x2: 0.4, y2: 1 },
};

const val = (v) => (Array.isArray(v) ? { type: v.length === 2 ? 'vector2' : 'vector3', value: v } : { type: 'float', value: v });

let keySeq = 0;
// keys: [[ms, value, ease?], ...]; ease names the segment arriving at that key.
export function anim(layerId, itemId, prop, keys) {
  return {
    type: 'setFxAnimator', compositionId: COMP,
    target: { type: 'styleProperty', layerId, itemId, propertyName: prop },
    animator: { type: 'keyframes', enabled: true, keyframes: keys.map(([t, v, e = 'inOut']) => ({ id: `k${++keySeq}`, layerTime: Math.round(t), value: val(v), easing: EASE[e] })) },
    dependencies: [], layerRefBindings: [],
  };
}

export const setVal = (layerId, itemId, prop, v) => ({ type: 'setFxPropertyValue', compositionId: COMP, target: { type: 'styleProperty', layerId, itemId, propertyName: prop }, value: val(v) });

export const glow = (layerId, effectId, threshold = 60, radius = 40, intensity = 0.8) => ({ type: 'addFxLayerEffect', compositionId: COMP, layerId, effectId, effect: { type: 'glow', glowThreshold: threshold, glowRadius: radius, glowIntensity: intensity } });
