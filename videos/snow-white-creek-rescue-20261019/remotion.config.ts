import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setConcurrency(1);
Config.setChromiumOpenGlRenderer('angle');
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', ...(c.resolve?.extensions ?? [])],
  },
}));
