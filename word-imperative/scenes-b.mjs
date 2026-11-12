// Scenes 3–6: "Close the door!", the imperative sentence, MUST DO, and the adjective example.
import {
  W, C, EN, ZH, S, SEG, at, word, prog, lerp, clamp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, emperor, talkLevel, measure,
} from './lib.mjs';

export function bubble(ctx, x, y, w, h, tx, ty) {
  ctx.save();
  ctx.fillStyle = 'rgba(15,5,45,0.45)';
  ctx.beginPath(); ctx.roundRect(x, y + 10, w, h, 48); ctx.fill();
  ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 48);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 70, y + h - 4); ctx.lineTo(tx, ty); ctx.lineTo(x + 150, y + h - 4);
  ctx.fill(); ctx.stroke();
  ctx.fillRect(x + 66, y + h - 12, 90, 12);
  ctx.restore();
}

export function check(ctx, x, y, s, color = C.mint) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 12 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 22 * s, y); ctx.lineTo(x - 6 * s, y + 18 * s); ctx.lineTo(x + 26 * s, y - 20 * s); ctx.stroke();
  ctx.restore();
}

// ---------- scene 3: Close the door! ----------
const T_SLAM = word('cmd', 'door').end;
const DOOR = { x: 1290, y: 300, w: 360, h: 600 };

function doorAngle(t) {
  const open = 72 * (Math.PI / 180);
  if (t < T_SLAM - 0.3) return open;
  if (t < T_SLAM) return open * (1 - Math.pow(prog(t, T_SLAM - 0.3, T_SLAM), 2.2));
  return 0.09 * Math.sin((t - T_SLAM) * 30) * Math.exp(-(t - T_SLAM) * 9);
}

function door(ctx, t) {
  const { x, y, w, h } = DOOR;
  ctx.save();
  ctx.fillStyle = '#7a4b2a';
  ctx.beginPath(); ctx.roundRect(x - 26, y - 26, w + 52, h + 26, [24, 24, 0, 0]); ctx.fill();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#7fd3ff'); sky.addColorStop(1, '#d5f4ff');
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5fcf80'; ctx.fillRect(x, y + h - 120, w, 120);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const cx = x + ((t * 40) % (w + 160)) - 80;
  ctx.beginPath(); ctx.ellipse(cx, y + 120, 60, 22, 0, 0, Math.PI * 2); ctx.ellipse(cx + 40, y + 104, 40, 22, 0, 0, Math.PI * 2); ctx.fill();
  // panel (hinged on the left edge, swinging toward the viewer)
  const th = doorAngle(t);
  const pw = w * Math.cos(th), dy = Math.sin(Math.abs(th)) * 46;
  ctx.fillStyle = '#d0854a'; ctx.strokeStyle = '#7a4b2a'; ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + pw, y - dy); ctx.lineTo(x + pw, y + h + dy); ctx.lineTo(x, y + h); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,75,42,0.6)'; ctx.lineWidth = 5;
  for (const [a, b] of [[0.12, 0.45], [0.55, 0.9]]) {
    ctx.beginPath();
    ctx.moveTo(x + pw * 0.15, y + h * a - dy * 0.15); ctx.lineTo(x + pw * 0.85, y + h * a - dy * 0.85);
    ctx.lineTo(x + pw * 0.85, y + h * b + dy * 0.85); ctx.lineTo(x + pw * 0.15, y + h * b + dy * 0.15); ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(x + pw * 0.88, y + h * 0.52, 14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // wind and leaves blowing in while it is open
  const windy = 1 - prog(t, T_SLAM - 0.3, T_SLAM);
  if (windy > 0) {
    ctx.save();
    ctx.globalAlpha *= windy;
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.9 + i / 6) % 1);
      const lx = lerp(x + w * 0.6, x - 520, u), ly = y + 140 + i * 70 + Math.sin(u * 9 + i) * 30;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx - 50, ly - 20, lx - 110, ly); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#5fcf80' : '#ffb347';
      ctx.save(); ctx.translate(lx - 140, ly + 40 * Math.sin(u * 7)); ctx.rotate(u * 12);
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
}

function commandScene(ctx, t) {
  const tB = SEG.cmd.words[0].start;
  const talk = talkLevel(t, ['cmd']);
  const point = easeOut(prog(t, tB - 0.2, tB + 0.15));
  door(ctx, t);
  emperor(ctx, t, 470, 930, 1.12, { talk, point, mood: t > tB - 0.3 && t < T_SLAM + 0.2 ? 'stern' : 'happy' });
  const bp = pop(t, tB - 0.15, 0.4);
  around(ctx, 610, 330, bp, bp, () => {
    bubble(ctx, 540, 210, 700, 190, 520, 560);
    let x = 585;
    for (const w of SEG.cmd.words) {
      const label = w.text === 'door' ? 'door!' : w.text;
      const ww = measure(ctx, label, 78, EN);
      const p = pop(t, w.start - 0.05, 0.35);
      around(ctx, x + ww / 2, 305, p, p, () => txt(ctx, label, x, 305, { size: 78, font: EN, align: 'left', color: label === 'Close' ? '#e0306a' : C.ink }));
      x += ww + 24;
    }
  });
  // BAM!
  const bam = pop(t, T_SLAM, 0.4);
  around(ctx, 1470, 220, bam, bam * (1 - prog(t, T_SLAM + 1.3, T_SLAM + 1.6)), () => {
    ctx.save();
    ctx.translate(1470, 220); ctx.rotate(-0.12);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 105 : 160, a = (i / 24) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.75);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    txt(ctx, 'BAM!', 1470, 222, { size: 100, font: EN, color: C.red, stroke: C.ink, sw: 10 });
  }, -0.1);
  burst(ctx, t, T_SLAM, 1470, 600, { r: 330, n: 12 });
}

// ---------- scene 4: the imperative sentence ----------
function grammarScene(ctx, t) {
  const t0 = S('cmdExplain');
  const tq = at('cmdExplain', '祈使');
  const cp = pop(t, t0 - 0.2, 0.5);
  const parts = [['(You)', 'rgba(255,255,255,0.35)'], ['Close', C.white], ['the door.', C.ink]];
  const size = 96;
  const widths = parts.map(([s]) => measure(ctx, s, size, EN));
  const total = widths.reduce((a, b) => a + b, 0) + 40 * 2;
  around(ctx, W / 2, 560, cp, cp, () => {
    card(ctx, W / 2 - total / 2 - 70, 460, total + 140, 200, { fill: C.cream, r: 44 });
    let x = W / 2 - total / 2;
    parts.forEach(([s, col], i) => {
      if (i === 1) {
        const hp = easeOut(prog(t, at('cmdExplain', '直接') - 0.1, at('cmdExplain', '直接') + 0.3));
        ctx.fillStyle = '#e0306a';
        ctx.beginPath(); ctx.roundRect(x - 16, 500, (widths[i] + 32) * Math.max(0.001, hp), 120, 26); ctx.fill();
      }
      const ghost = i === 0;
      txt(ctx, s, x, 562, { size, font: EN, align: 'left', color: ghost ? '#b9a9e6' : i === 1 ? (t > at('cmdExplain', '直接') ? C.white : C.ink) : col });
      if (ghost) {
        ctx.save(); ctx.strokeStyle = '#b9a9e6'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x - 6, 566); ctx.lineTo(x + widths[i] + 6, 556); ctx.stroke(); ctx.restore();
      }
      parts[i].x = x;
      x += widths[i] + 40;
    });
  });
  const a1 = pop(t, at('cmdExplain', '直接') + 0.1, 0.4);
  const xc = parts[1].x + widths[1] / 2;
  around(ctx, xc, 760, a1, a1, () => {
    arrow(ctx, xc, 800, xc, 690, { color: C.pink, w: 9, head: 26 });
    txt(ctx, '一开口就是动作', xc, 840, { size: 46, color: C.pink });
  });
  const a2 = pop(t, at('cmdExplain', '叫') + 0.05, 0.4);
  const xy = parts[0].x + widths[0] / 2;
  around(ctx, xy, 400, a2, a2, () => txt(ctx, '“你”省略了', xy, 410, { size: 40, color: C.lilac }));
  const tp = pop(t, tq - 0.1, 0.5);
  around(ctx, W / 2, 250, tp, tp, () => {
    txt(ctx, '祈使句', W / 2, 225, { size: 130, color: C.gold, stroke: C.ink, sw: 14, shadow: 'rgba(10,0,40,0.5)' });
    txt(ctx, 'imperative sentence', W / 2, 330, { size: 50, font: EN, color: C.white });
  }, Math.sin(t * 4) * 0.02);
  burst(ctx, t, tq, W / 2, 230, { r: 300, n: 12 });
}

// ---------- scene 5: MUST DO ----------
const TODO = [['关门', 'Close the door'], ['保存工作', 'Save your work'], ['准时到', 'Be on time']];

function mustScene(ctx, t) {
  const t0 = S('must');
  const tWho = at('must', '谁'), tMust = at('must', '必须'), tNo = at('must', '非做不可');
  const stern = t < tWho + 0.9;
  emperor(ctx, t, 400, 930, 1.12, { point: easeOut(prog(t, t0 + 0.1, t0 + 0.4)) * (stern ? 1 : 0), mood: stern ? 'stern' : 'happy', wave: stern ? 0 : 0.6 });
  // the scroll unrolls
  const un = easeOut(prog(t, t0 - 0.2, t0 + 0.5));
  const X = 820, Y = 170, Wd = 800, Hd = 640 * un;
  ctx.save();
  ctx.fillStyle = 'rgba(15,5,45,0.45)'; ctx.fillRect(X + 10, Y + 14, Wd, Hd);
  ctx.fillStyle = '#fbe7c0'; ctx.fillRect(X, Y, Wd, Hd);
  ctx.fillStyle = '#e7c58c';
  for (const yy of [Y, Y + Hd]) { ctx.beginPath(); ctx.roundRect(X - 30, yy - 22, Wd + 60, 44, 22); ctx.fill(); }
  ctx.beginPath(); ctx.rect(X, Y, Wd, Hd); ctx.clip();
  txt(ctx, 'MUST DO', X + Wd / 2, Y + 90, { size: 86, font: EN, color: '#c81d4e' });
  TODO.forEach(([zh, en], i) => {
    const yy = Y + 220 + i * 130;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(X + 70, yy - 36, 72, 72, 14); ctx.stroke();
    const ck = pop(t, tWho + i * 0.2, 0.3);
    if (ck > 0) around(ctx, X + 106, yy, ck, ck, () => check(ctx, X + 106, yy, 1.3, '#1fa36b'));
    txt(ctx, zh, X + 180, yy - 14, { size: 50, align: 'left', color: C.ink });
    txt(ctx, en, X + 180, yy + 32, { size: 34, font: EN, align: 'left', color: '#8a6b3a' });
  });
  ctx.restore();
  // the stamp
  const sp = prog(t, tMust - 0.18, tMust);
  if (sp > 0) {
    const sc = sp < 1 ? lerp(2.6, 1, easeIO(sp)) : 1;
    around(ctx, X + Wd - 170, Y + 470, sc, Math.min(1, sp * 2), () => {
      ctx.save();
      ctx.translate(X + Wd - 170, Y + 470); ctx.rotate(-0.22);
      ctx.strokeStyle = '#e0243f'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.roundRect(-170, -95, 340, 190, 26); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(-150, -75, 300, 150, 18); ctx.stroke();
      ctx.restore();
      txt(ctx, '必须！', X + Wd - 170, Y + 472, { size: 92, color: '#e0243f' });
    }, -0.22);
  }
  // bottom banner
  const bp = pop(t, tNo - 0.1, 0.45);
  around(ctx, X + Wd / 2, 880, bp, bp, () => {
    card(ctx, X + 20, 832, Wd - 40, 96, { fill: C.gold, r: 48, drop: 8 });
    txt(ctx, 'imperative = 必须的 · 非做不可', X + Wd / 2, 882, { size: 50, font: EN, color: C.ink });
  });
  // sweat drops while nobody dares to refuse
  const sw = prog(t, tWho, tWho + 0.8);
  if (sw > 0 && sw < 1) {
    for (let i = 0; i < 3; i++) {
      const p = (sw * 2 + i / 3) % 1;
      ctx.fillStyle = `rgba(120,200,255,${1 - p})`;
      ctx.beginPath(); ctx.ellipse(X - 40 + i * 30, Y + 230 + p * 120, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- scene 6: adjective example ----------
export function exampleCard(ctx, t, id, highlight, tagText, tagColor) {
  const seg = SEG[id];
  const size = 76;
  const toks = seg.text.replace(/\.$/, '').split(' ').map((w, i, a) => (i === a.length - 1 ? w + '.' : w));
  const ws = toks.map((w) => measure(ctx, w, size, EN));
  const gap = 26;
  const total = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
  const cp = pop(t, seg.start - 0.5, 0.5);
  around(ctx, W / 2, 470, cp, cp, () => {
    card(ctx, W / 2 - total / 2 - 70, 380, total + 140, 180, { fill: C.cream, r: 44 });
    let x = W / 2 - total / 2;
    toks.forEach((w, i) => {
      const bw = seg.words[i];
      const p = bw ? pop(t, bw.start - 0.08, 0.3) : 1;
      const hot = highlight.includes(i);
      if (hot) {
        const hp = easeOut(prog(t, bw.start, bw.start + 0.25));
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.roundRect(x - 12, 425, (ws[i] + 24) * Math.max(0.001, hp), 96, 20); ctx.fill();
      }
      around(ctx, x + ws[i] / 2, 472, 0.6 + 0.4 * p, Math.max(0.25, p), () =>
        txt(ctx, w, x, 472, { size, font: EN, align: 'left', color: hot ? C.ink : '#3d2a7a' }));
      x += ws[i] + gap;
    });
  });
  const tp = pop(t, seg.start - 0.3, 0.45);
  around(ctx, W / 2, 270, tp, tp, () => {
    const tw = measure(ctx, tagText, 50, EN) + 80;
    card(ctx, W / 2 - tw / 2, 222, tw, 96, { fill: tagColor, r: 48, drop: 8 });
    txt(ctx, tagText, W / 2, 272, { size: 50, font: EN, color: C.ink });
  });
}

function adjScene(ctx, t) {
  exampleCard(ctx, t, 'exAdj', [2], 'adj. 形容词 · 必须的', C.gold);
  // saving progress bar
  const s0 = word('exAdj', 'save').start, s1 = E_ex() + 0.4;
  const p = easeIO(prog(t, s0, s1));
  const ap = fadeIn(t, s0 - 0.2, 0.3);
  around(ctx, W / 2, 700, 1, ap, () => {
    const bx = W / 2 - 330, by = 680;
    // document icon
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.roundRect(bx - 120, by - 50, 76, 96, 10); ctx.fill();
    ctx.fillStyle = C.sky; for (let i = 0; i < 3; i++) ctx.fillRect(bx - 106, by - 28 + i * 22, 48, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.roundRect(bx, by - 26, 660, 52, 26); ctx.fill();
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.roundRect(bx, by - 26, Math.max(52, 660 * p), 52, 26); ctx.fill();
    txt(ctx, `${Math.round(p * 100)}%`, bx + 330, by + 2, { size: 34, font: EN, color: C.ink });
    const dn = pop(t, s1, 0.4);
    if (dn > 0) around(ctx, bx + 740, by, dn, dn, () => { check(ctx, bx + 720, by, 1.6, C.mint); txt(ctx, '已保存', bx + 770, by + 2, { size: 44, align: 'left', color: C.mint }); });
  });
  burst(ctx, t, s1, W / 2 + 420, 680, { r: 160, n: 8 });
}
const E_ex = () => SEG.exAdj.end;

export const scenesB = [
  { id: 'command', from: S('cmdLead') - 0.3, to: S('cmdExplain') - 0.35, draw: commandScene },
  { id: 'grammar', from: S('cmdExplain') - 0.35, to: S('must') - 0.3, draw: grammarScene },
  { id: 'must', from: S('must') - 0.3, to: S('exAdj') - 0.55, draw: mustScene },
  { id: 'adj', from: S('exAdj') - 0.55, to: S('noun') - 0.3, draw: adjScene },
];

export const eventsB = [
  { type: 'whoosh', t: S('cmdLead') - 0.35, d: 0.45 },
  { type: 'wind', t: S('cmdLead') - 0.2, d: T_SLAM - S('cmdLead') },
  { type: 'pop', t: SEG.cmd.words[0].start - 0.15, f: 700 },
  { type: 'slam', t: T_SLAM, shake: 22 },
  { type: 'whoosh', t: S('cmdExplain') - 0.4, d: 0.45 },
  { type: 'pop', t: at('cmdExplain', '直接'), f: 900 },
  { type: 'pop', t: at('cmdExplain', '叫') + 0.05, f: 1100 },
  { type: 'tada', t: at('cmdExplain', '祈使') - 0.1, amp: 0.6 },
  { type: 'whoosh', t: S('must') - 0.35, d: 0.5, from: 300, to: 1500 },
  ...TODO.map((_, i) => ({ type: 'tick', t: at('must', '谁') + i * 0.2, n: 79 + i * 4 })),
  { type: 'stamp', t: at('must', '必须'), shake: 16 },
  { type: 'pop', t: at('must', '非做不可') - 0.1, f: 700 },
  { type: 'whoosh', t: S('exAdj') - 0.6, d: 0.45 },
  { type: 'pop', t: word('exAdj', 'imperative').start, f: 1000 },
  { type: 'ding', t: SEG.exAdj.end + 0.4, n: 91 },
];
void ZH; void clamp; void arrow; void W;
