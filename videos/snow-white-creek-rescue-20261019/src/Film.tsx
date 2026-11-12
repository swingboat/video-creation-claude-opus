// Remotion component that drives the imperative Three.js Scene deterministically per frame.
import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene, Quality, QUALITY_HIGH } from './scene';

let singleton: { scene: Scene; sig: string; canvas: HTMLCanvasElement } | null = null;

export type FilmProps = { quality?: Quality };

export const Film: React.FC<FilmProps> = ({ quality }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const hostRef = useRef<HTMLDivElement>(null);
  const q = quality ?? QUALITY_HIGH;
  const sig = `${width}x${height}@${q.shadowMap}:${q.bloom}:${q.dof}:${q.forest}:${q.pixelRatio}`;

  useEffect(() => {
    const handle = delayRender(`frame ${frame}`, { timeoutInMilliseconds: 240000 });
    const host = hostRef.current!;
    if (!singleton || singleton.sig !== sig) {
      if (singleton) {
        singleton.scene.renderer.dispose();
        singleton.canvas.remove();
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      const scene = new Scene(canvas, width, height, q);
      singleton = { scene, sig, canvas };
    }
    const canvas = singleton.canvas;
    if (canvas.parentElement !== host) {
      host.innerHTML = '';
      host.appendChild(canvas);
    }
    const t = frame / fps;
    const sc = singleton.scene;
    sc.ready
      .then(() => {
        sc.renderAt(t);
        // ensure the GPU has flushed before Remotion snapshots the canvas
        requestAnimationFrame(() => {
          sc.renderer.getContext().finish?.();
          continueRender(handle);
        });
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
    return () => {};
  }, [frame, sig, fps, width, height, q]);

  return <AbsoluteFill style={{ backgroundColor: '#1a2024' }}><div ref={hostRef} style={{ width: '100%', height: '100%' }} /></AbsoluteFill>;
};
