// Remotion root: compositions for preview, test clip and final film.
import React, { useEffect } from 'react';
import { AbsoluteFill, Audio, Composition, continueRender, delayRender, staticFile } from 'remotion';
import { Film } from './Film';
import { Overlay, loadFont } from './Overlay';
import { QUALITY_HIGH, QUALITY_PREVIEW } from './scene';
import cues from './timeline/cues.json';

const AUDIO_PATH = 'audio/final-mix.wav';

const Movie: React.FC<{ quality: 'high' | 'preview'; withAudio: boolean }> = ({ quality, withAudio }) => {
  useEffect(() => {
    const h = delayRender('font');
    loadFont();
    const id = setTimeout(() => continueRender(h), 200);
    return () => clearTimeout(id);
  }, []);
  return (
    <AbsoluteFill>
      <Film quality={quality === 'high' ? QUALITY_HIGH : QUALITY_PREVIEW} />
      <Overlay />
      {withAudio && <Audio src={staticFile(AUDIO_PATH)} />}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  const common = { width: cues.width, height: cues.height, fps: cues.fps, durationInFrames: Math.round(cues.duration * cues.fps) };
  return (
    <>
      <Composition id="film" component={Movie as any} {...common} defaultProps={{ quality: 'high' as const, withAudio: true }} />
      <Composition id="film-silent" component={Movie as any} {...common} defaultProps={{ quality: 'high' as const, withAudio: false }} />
      <Composition id="preview" component={Movie as any} {...common} defaultProps={{ quality: 'preview' as const, withAudio: true }} />
    </>
  );
};
