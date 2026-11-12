// Title card + dialogue subtitles (crisp DOM text over the WebGL canvas).
import React from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import cues from './timeline/cues.json';

export const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // subtitle
  let sub = '';
  for (const d of cues.dialogue) {
    const dur = Math.max(1.1, 0.16 * d.text.length);
    if (t >= d.t - 0.1 && t < d.t + dur) sub = d.text;
  }

  // title at ~87s
  const titleIn = interpolate(t, [cues.beats.titleIn, cues.beats.titleIn + 1.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const titleY = interpolate(titleIn, [0, 1], [26, 0]);
  const subOpacity = interpolate(t, [cues.beats.titleIn + 1.0, cues.beats.titleIn + 2.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ fontFamily: 'ZCOOL, serif', pointerEvents: 'none' }}>
      {sub && t < cues.beats.titleIn && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            width: '100%',
            textAlign: 'center',
            fontSize: 40,
            color: '#fdf6e8',
            textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
            letterSpacing: 2,
          }}
        >
          {sub}
        </div>
      )}
      {titleIn > 0.001 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div
            style={{
              opacity: titleIn,
              transform: `translateY(${titleY}px)`,
              fontSize: 96,
              color: '#fff4dc',
              textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 8px rgba(255,210,130,0.5)',
              letterSpacing: 8,
            }}
          >
            溪谷救援
          </div>
          <div style={{ opacity: subOpacity, marginTop: 18, fontSize: 34, color: '#f0e2c6', letterSpacing: 10, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
            白雪公主与七个小矮人
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const loadFont = () => {
  const font = new FontFace('ZCOOL', `url(${staticFile('fonts/ZCOOLXiaoWei-Regular.ttf')})`);
  // @ts-ignore
  if (typeof document !== 'undefined') {
    font.load().then((f) => (document as any).fonts.add(f)).catch(() => {});
  }
};
