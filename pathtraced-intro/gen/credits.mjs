// 2D credits and end card (Tesseract FX text layers, Cinzel). Image icons + audio are added later by gen/media.mjs.
import { COMP } from './lib/act.mjs';

const ROLE = [0.85, 0.79, 0.68, 1], NAME = [0.94, 0.89, 0.78, 1];
let nextLayer = 500;

// Positions: x = left edge of the text column, y = role baseline. Names sit 56px below their role.
export const BLOCKS = [
  { at: 4000, dur: 2500, x: 1270, y: 150, icon: [1200, 166], lines: [['3D ENGINE', 'Yusuke Shibata']] },
  { at: 9900, dur: 2000, x: 540, y: 500, icon: [470, 516], lines: [['MODELING & RIGGING', 'Michael Vitt'], ['PATH TRACING', 'Joyce Chen']] },
  { at: 13500, dur: 2800, x: 300, y: 620, icon: [230, 636], lines: [['3D CONCURRENCY', 'John Roberts'], ['3D BUILD SUPPORT', 'Jason Silberman'], ['3D TESTING', 'Alex Du']] },
  { at: 16600, dur: 2500, x: 1250, y: 560, icon: [1180, 576], lines: [['RELEASE PIPELINE', 'Michael Yang'], ['CRITIC REVIEW', 'Gaurav Misra'], ['FONT DELIVERY', 'Ben Fortier']] },
  { at: 21200, dur: 2400, x: 300, y: 430, icon: [230, 446], lines: [['FX STORYLINE', 'Sicheng Chen'], ['CAPTION EDITING', 'Sebastian Griego'], ['CI EFFICIENCY', 'Christine Dumont']] },
];

const text = (parent, dur, x, y, str, { size, color, tracking, style = 'Regular', just = 'left' }) => ({
  type: 'createFxTextLayer', compositionId: COMP, parentLayerId: parent, insertIndex: 0, layerId: ++nextLayer, name: str,
  activeRange: { start: 0, duration: dur },
  transform: { anchorPoint: [0, 0], position: [x, y], scale: [100, 100], rotation: 0, opacity: 100 },
  sourceText: { text: str, fontFamily: 'Cinzel', fontStyle: style, fontSize: size, fillColor: color, justification: just, tracking },
});

const fade = (layerId, dur, inMs = 450, outMs = 450) => ({
  type: 'setFxPropertyKeyframes', compositionId: COMP, property: { layerId, propertyType: 'opacity' },
  keyframes: [
    { id: `op${layerId}a`, layerTime: 0, value: { type: 'float', value: 0 }, easing: { type: 'linear' } },
    { id: `op${layerId}b`, layerTime: inMs, value: { type: 'float', value: 100 }, easing: { type: 'cubicBezier', x1: 0.3, y1: 0, x2: 0.3, y2: 1 } },
    { id: `op${layerId}c`, layerTime: dur - outMs, value: { type: 'float', value: 100 }, easing: { type: 'linear' } },
    { id: `op${layerId}d`, layerTime: dur, value: { type: 'float', value: 0 }, easing: { type: 'cubicBezier', x1: 0.5, y1: 0, x2: 0.8, y2: 1 } },
  ],
});

function group(name, start, dur) {
  const id = ++nextLayer;
  return { id, act: { type: 'createFxGroupLayer', compositionId: COMP, layerId: id, name, insertIndex: 0, activeRange: { start, duration: dur }, transform: { anchorPoint: [0, 0], position: [0, 0], scale: [100, 100], rotation: 0, opacity: 100 } } };
}

export default function credits() {
  nextLayer = 500;
  const acts = [];
  BLOCKS.forEach((b, i) => {
    const g = group(`Credits ${i + 1}`, b.at, b.dur);
    acts.push(g.act, fade(g.id, b.dur));
    b.lines.forEach(([role, name], k) => {
      const y = b.y + k * 135;
      acts.push(text(g.id, b.dur, b.x, y, role, { size: 21, color: ROLE, tracking: 260 }));
      acts.push(text(g.id, b.dur, b.x + 24, y + 56, name, { size: 52, color: NAME, tracking: 90 }));
    });
  });
  const end = group('End card', 32800, 4800);
  acts.push(end.act, fade(end.id, 4800, 900, 900));
  acts.push(text(end.id, 4800, 960, 520, 'TESSERACT 3D', { size: 66, color: NAME, tracking: 200, just: 'center' }));
  acts.push(text(end.id, 4800, 960, 566, 'NOW AVAILABLE WORLDWIDE', { size: 19, color: ROLE, tracking: 520, just: 'center' }));
  acts.push(text(end.id, 4800, 960, 640, 'MIRAGE', { size: 26, color: ROLE, tracking: 650, just: 'center' }));
  return acts;
}
