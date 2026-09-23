import { defineConfig } from '@internal/tsdown-config';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  dts: true,
  minify: false,
  clean: true,
  // Node-only: it reads a directory of downloaded build artifacts and writes
  // the manifest beside them.
  platform: 'node',
});
