import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  dts: true,
  minify: false,
  clean: true,
  // Node-only: it reads and writes the files of a checkout, and the binary
  // takes its arguments from `process.argv`.
  platform: 'node',
});
