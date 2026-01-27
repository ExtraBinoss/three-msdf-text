import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    glsl(),
    dts({ 
      insertTypesEntry: true,
      include: ['src/library/**', 'src/index.ts']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MSDFTextEngine',
      fileName: (format) => `msdf-text-engine.${format}.js`,
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
  },
});
