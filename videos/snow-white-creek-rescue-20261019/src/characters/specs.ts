// Character design parameters. Change looks here (see docs/01-角色设定.md).
import type { HeadShape } from './parts';

export type CharId = 'snow' | 'doc' | 'grumpy' | 'happy' | 'sleepy' | 'bashful' | 'sneezy' | 'dopey';
export const DWARFS: CharId[] = ['doc', 'grumpy', 'happy', 'sleepy', 'bashful', 'sneezy', 'dopey'];
export const ALL: CharId[] = ['snow', ...DWARFS];

export type NoseType = 'small' | 'bulb' | 'hook' | 'round' | 'long' | 'button' | 'wide';
export type BeardStyle = 'none' | 'long' | 'short' | 'fluffy' | 'split' | 'wispy' | 'curly';

export type Spec = {
  id: CharId;
  name: string;
  princess?: boolean;
  skin: string;
  cheekColor: string;
  head: HeadShape;
  eye: { r: number; sep: number; y: number; iris: string; lidOpen: number; lash: number; lowerLid: number };
  brow: { color: string; thick: number; count: number; len: number; y: number; angle: number; arch: number };
  nose: { type: NoseType; size: number; color: string; y: number };
  ears: { scale: number; out: number };
  mouth: { w: number; lip: string; thick: number; y: number };
  beard: { style: BeardStyle; color: string; len: number; width: number; count: number; mustache: number };
  hair: { color: string };
  hat?: { color: string; height: number; droop: number; side: number; cuff: string; flat?: boolean };
  glasses?: boolean;
  body: {
    legLen: number; // hip joint to ankle
    footH: number;
    torso: number; // hips to neck base
    neck: number;
    chestW: number;
    chestD: number;
    belly: number;
    hipW: number;
    upperArm: number;
    foreArm: number;
    hand: number;
    footLen: number;
    limbR: number;
  };
  clothes: { tunic: string; sleeve: string; pants: string; belt: string; boots: string; tunicLen: number; collar?: string; baggy?: number };
  posture: { slouch: number; headFwd: number; shoulderDrop: number };
  gait: { step: number; bounce: number; sway: number; armSwing: number };
  voice?: string;
};

const dwarfBody = (o: Partial<Spec['body']> = {}): Spec['body'] => ({
  legLen: 0.33,
  footH: 0.055,
  torso: 0.36,
  neck: 0.03,
  chestW: 0.2,
  chestD: 0.17,
  belly: 0.04,
  hipW: 0.085,
  upperArm: 0.19,
  foreArm: 0.165,
  hand: 1.25,
  footLen: 0.2,
  limbR: 0.05,
  ...o,
});

export const SPECS: Record<CharId, Spec> = {
  snow: {
    id: 'snow',
    name: '白雪公主',
    princess: true,
    skin: '#f1d3c2',
    cheekColor: '#e48b86',
    head: { r: 0.098, vScale: 1.2, jaw: 0.42, chinFwd: 0.08, cheek: 0.12, brow: 0.02, round: 0.8, chinDrop: 0.03 },
    eye: { r: 0.0118, sep: 0.032, y: 0.009, iris: '#5a3a22', lidOpen: 0.92, lash: 1, lowerLid: 0.9 },
    brow: { color: '#1a1210', thick: 0.0022, count: 26, len: 0.012, y: 0.03, angle: 0.08, arch: 0.6 },
    nose: { type: 'small', size: 0.6, color: '#efc8b6', y: -0.01 },
    ears: { scale: 0.85, out: 0.1 },
    mouth: { w: 0.0175, lip: '#b8323d', thick: 0.0048, y: -0.052 },
    beard: { style: 'none', color: '#000', len: 0, width: 0, count: 0, mustache: 0 },
    hair: { color: '#0b0809' },
    body: {
      legLen: 0.8,
      footH: 0.07,
      torso: 0.5,
      neck: 0.085,
      chestW: 0.155,
      chestD: 0.105,
      belly: 0,
      hipW: 0.085,
      upperArm: 0.285,
      foreArm: 0.245,
      hand: 1.0,
      footLen: 0.24,
      limbR: 0.036,
    },
    clothes: { tunic: '#20367a', sleeve: '#2b4da0', pants: '#eac63a', belt: '#c92230', boots: '#6a3c22', tunicLen: 0, collar: '#f3efe6' },
    posture: { slouch: -0.03, headFwd: 0.0, shoulderDrop: 0 },
    gait: { step: 0.62, bounce: 0.018, sway: 0.02, armSwing: 0.6 },
    voice: 'Tingting',
  },
  doc: {
    id: 'doc',
    name: '博士',
    skin: '#e9bfa4',
    cheekColor: '#d77d6c',
    head: { r: 0.128, vScale: 1.05, jaw: 0.18, chinFwd: 0.03, cheek: 0.25, brow: 0.05, round: 0.9 },
    eye: { r: 0.0135, sep: 0.043, y: 0.015, iris: '#4a5a6a', lidOpen: 0.82, lash: 0, lowerLid: 0.85 },
    brow: { color: '#d8d4cc', thick: 0.0035, count: 40, len: 0.022, y: 0.042, angle: 0.0, arch: 0.4 },
    nose: { type: 'bulb', size: 1.25, color: '#e1a088', y: -0.02 },
    ears: { scale: 1.1, out: 0.18 },
    mouth: { w: 0.024, lip: '#a85a50', thick: 0.0055, y: -0.068 },
    beard: { style: 'split', color: '#e8e5df', len: 0.32, width: 1.0, count: 420, mustache: 1 },
    hair: { color: '#dcd8d0' },
    hat: { color: '#9a4a24', height: 0.3, droop: 0.35, side: 0.05, cuff: '#7a3a1c' },
    glasses: true,
    body: dwarfBody({ belly: 0.05, chestW: 0.21 }),
    clothes: { tunic: '#8a3b22', sleeve: '#7a3420', pants: '#5a4630', belt: '#2c1e14', boots: '#4a3020', tunicLen: 0.2 },
    posture: { slouch: 0.06, headFwd: 0.02, shoulderDrop: 0.0 },
    gait: { step: 0.3, bounce: 0.02, sway: 0.03, armSwing: 0.4 },
    voice: 'Grandpa',
  },
  grumpy: {
    id: 'grumpy',
    name: '爱生气',
    skin: '#ddb093',
    cheekColor: '#c56f5c',
    head: { r: 0.126, vScale: 1.0, jaw: 0.05, chinFwd: 0.02, cheek: 0.1, brow: 0.09, round: 0.75 },
    eye: { r: 0.012, sep: 0.041, y: 0.008, iris: '#3a2a20', lidOpen: 0.62, lash: 0, lowerLid: 0.78 },
    brow: { color: '#2a2220', thick: 0.006, count: 90, len: 0.03, y: 0.03, angle: -0.35, arch: 0.05 },
    nose: { type: 'hook', size: 1.35, color: '#d69580', y: -0.018 },
    ears: { scale: 1.0, out: 0.15 },
    mouth: { w: 0.022, lip: '#94544a', thick: 0.005, y: -0.066 },
    beard: { style: 'short', color: '#6a6460', len: 0.17, width: 1.05, count: 380, mustache: 0.9 },
    hair: { color: '#5a5450' },
    hat: { color: '#5e1c1c', height: 0.26, droop: 0.15, side: -0.12, cuff: '#4a1414' },
    body: dwarfBody({ chestW: 0.215, upperArm: 0.2, foreArm: 0.17, hand: 1.3 }),
    clothes: { tunic: '#8c4a2e', sleeve: '#7a3e26', pants: '#3e3428', belt: '#1e1610', boots: '#3a2618', tunicLen: 0.17 },
    posture: { slouch: 0.18, headFwd: 0.05, shoulderDrop: 0.0 },
    gait: { step: 0.31, bounce: 0.012, sway: 0.015, armSwing: 0.25 },
    voice: 'Rocko',
  },
  happy: {
    id: 'happy',
    name: '开心果',
    skin: '#f0c4a8',
    cheekColor: '#e57c6a',
    head: { r: 0.14, vScale: 0.94, jaw: -0.05, chinFwd: 0.02, cheek: 0.5, brow: 0.02, round: 1.0 },
    eye: { r: 0.0128, sep: 0.044, y: 0.022, iris: '#3e5c3a', lidOpen: 0.78, lash: 0, lowerLid: 0.7 },
    brow: { color: '#ece8e0', thick: 0.0032, count: 34, len: 0.02, y: 0.045, angle: 0.25, arch: 0.9 },
    nose: { type: 'round', size: 1.25, color: '#ec9a86', y: -0.018 },
    ears: { scale: 1.1, out: 0.2 },
    mouth: { w: 0.03, lip: '#b0584c', thick: 0.006, y: -0.066 },
    beard: { style: 'fluffy', color: '#f2efe8', len: 0.24, width: 1.3, count: 460, mustache: 1 },
    hair: { color: '#ece8e2' },
    hat: { color: '#c46a1c', height: 0.26, droop: 0.25, side: 0.1, cuff: '#9a5014' },
    body: dwarfBody({ belly: 0.11, chestW: 0.235, chestD: 0.2, hipW: 0.095, legLen: 0.31 }),
    clothes: { tunic: '#d07a24', sleeve: '#b8681c', pants: '#6a4a2c', belt: '#2e2014', boots: '#5a3a22', tunicLen: 0.19 },
    posture: { slouch: -0.04, headFwd: 0.0, shoulderDrop: 0 },
    gait: { step: 0.28, bounce: 0.03, sway: 0.04, armSwing: 0.5 },
    voice: 'Eddy',
  },
  sleepy: {
    id: 'sleepy',
    name: '瞌睡虫',
    skin: '#e6bea2',
    cheekColor: '#cf8473',
    head: { r: 0.124, vScale: 1.16, jaw: 0.22, chinFwd: 0.0, cheek: 0.08, brow: 0.02, round: 0.85, chinDrop: 0.05 },
    eye: { r: 0.0128, sep: 0.041, y: 0.006, iris: '#4f4a3a', lidOpen: 0.32, lash: 0, lowerLid: 0.86 },
    brow: { color: '#a8a39a', thick: 0.0032, count: 34, len: 0.024, y: 0.035, angle: 0.4, arch: 0.3 },
    nose: { type: 'long', size: 1.2, color: '#d9a08a', y: -0.024 },
    ears: { scale: 1.05, out: 0.12 },
    mouth: { w: 0.022, lip: '#9c5a50', thick: 0.005, y: -0.074 },
    beard: { style: 'long', color: '#bdb8ae', len: 0.3, width: 0.85, count: 380, mustache: 0.9 },
    hair: { color: '#aaa49a' },
    hat: { color: '#2f5a34', height: 0.4, droop: 0.95, side: 0.25, cuff: '#244628' },
    body: dwarfBody({ legLen: 0.36, torso: 0.38, chestW: 0.19, upperArm: 0.205, foreArm: 0.18 }),
    clothes: { tunic: '#3c5a3a', sleeve: '#324e30', pants: '#4a4232', belt: '#2a2016', boots: '#433022', tunicLen: 0.2 },
    posture: { slouch: 0.14, headFwd: 0.04, shoulderDrop: 0.03 },
    gait: { step: 0.29, bounce: 0.01, sway: 0.035, armSwing: 0.2 },
    voice: 'Grandpa',
  },
  bashful: {
    id: 'bashful',
    name: '害羞鬼',
    skin: '#f0c9b0',
    cheekColor: '#ef7f84',
    head: { r: 0.124, vScale: 1.02, jaw: 0.12, chinFwd: 0.0, cheek: 0.28, brow: 0.0, round: 0.95 },
    eye: { r: 0.0128, sep: 0.04, y: 0.012, iris: '#4a6a8a', lidOpen: 0.72, lash: 0.3, lowerLid: 0.85 },
    brow: { color: '#8a6a4a', thick: 0.003, count: 30, len: 0.018, y: 0.04, angle: 0.45, arch: 0.5 },
    nose: { type: 'button', size: 0.95, color: '#ea9f8c', y: -0.016 },
    ears: { scale: 1.0, out: 0.14 },
    mouth: { w: 0.02, lip: '#b25e58', thick: 0.005, y: -0.064 },
    beard: { style: 'curly', color: '#9a7a58', len: 0.14, width: 1.0, count: 360, mustache: 0.7 },
    hair: { color: '#8a6a4a' },
    hat: { color: '#7a8a3a', height: 0.25, droop: 0.3, side: -0.05, cuff: '#5e6c2c' },
    body: dwarfBody({ legLen: 0.32, chestW: 0.195 }),
    clothes: { tunic: '#6e7a32', sleeve: '#5e6a2a', pants: '#5a4a34', belt: '#2a2014', boots: '#4a3424', tunicLen: 0.18 },
    posture: { slouch: 0.1, headFwd: 0.03, shoulderDrop: 0.03 },
    gait: { step: 0.26, bounce: 0.015, sway: 0.02, armSwing: 0.15 },
    voice: 'Reed',
  },
  sneezy: {
    id: 'sneezy',
    name: '喷嚏精',
    skin: '#ebc0a6',
    cheekColor: '#d77a6c',
    head: { r: 0.126, vScale: 1.06, jaw: 0.15, chinFwd: 0.02, cheek: 0.2, brow: 0.03, round: 0.9 },
    eye: { r: 0.0125, sep: 0.04, y: 0.012, iris: '#5a4a32', lidOpen: 0.75, lash: 0, lowerLid: 0.82 },
    brow: { color: '#b4ada0', thick: 0.003, count: 34, len: 0.02, y: 0.04, angle: 0.15, arch: 0.6 },
    nose: { type: 'wide', size: 1.35, color: '#e05a52', y: -0.02 },
    ears: { scale: 1.0, out: 0.16 },
    mouth: { w: 0.022, lip: '#a85850', thick: 0.005, y: -0.068 },
    beard: { style: 'wispy', color: '#c9c3b8', len: 0.22, width: 0.95, count: 380, mustache: 0.8 },
    hair: { color: '#b8b2a6' },
    hat: { color: '#7a5634', height: 0.27, droop: 0.4, side: 0.15, cuff: '#5e4026' },
    body: dwarfBody({ chestW: 0.2 }),
    clothes: { tunic: '#a8762e', sleeve: '#946828', pants: '#4e4232', belt: '#2a1e14', boots: '#4a3020', tunicLen: 0.18 },
    posture: { slouch: 0.05, headFwd: 0.02, shoulderDrop: 0 },
    gait: { step: 0.3, bounce: 0.02, sway: 0.025, armSwing: 0.35 },
    voice: 'Reed',
  },
  dopey: {
    id: 'dopey',
    name: '糊涂蛋',
    skin: '#f3d0b8',
    cheekColor: '#ec958a',
    head: { r: 0.12, vScale: 1.0, jaw: 0.28, chinFwd: 0.0, cheek: 0.22, brow: 0.0, round: 1.0 },
    eye: { r: 0.0145, sep: 0.041, y: 0.016, iris: '#5c7aa0', lidOpen: 0.95, lash: 0.4, lowerLid: 0.9 },
    brow: { color: '#a07850', thick: 0.0025, count: 18, len: 0.014, y: 0.05, angle: 0.3, arch: 0.8 },
    nose: { type: 'button', size: 0.85, color: '#efaa96', y: -0.014 },
    ears: { scale: 1.9, out: 0.5 },
    mouth: { w: 0.024, lip: '#c06a60', thick: 0.0055, y: -0.06 },
    beard: { style: 'none', color: '#000', len: 0, width: 0, count: 0, mustache: 0 },
    hair: { color: '#9a7048' },
    hat: { color: '#5c3a8a', height: 0.22, droop: 0.2, side: 0.0, cuff: '#4a2c72', flat: true },
    body: dwarfBody({ legLen: 0.31, torso: 0.34, chestW: 0.18, upperArm: 0.19, foreArm: 0.17, hand: 1.15 }),
    clothes: { tunic: '#4f7a3a', sleeve: '#4f7a3a', pants: '#5c4a36', belt: '#3a2c20', boots: '#5a3c26', tunicLen: 0.27, baggy: 1.35 },
    posture: { slouch: 0.02, headFwd: 0.03, shoulderDrop: 0.02 },
    gait: { step: 0.27, bounce: 0.04, sway: 0.04, armSwing: 0.6 },
  },
};
