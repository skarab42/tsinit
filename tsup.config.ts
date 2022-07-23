import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/init.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
  platform: 'node',
  splitting: true,
  sourcemap: false,
  minify: true,
  clean: true,
  dts: true,
});
