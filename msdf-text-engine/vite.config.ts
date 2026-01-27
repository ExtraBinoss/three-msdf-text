import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  const isLibrary = command === 'build' && process.env.VITE_BUILD_MODE === 'library';

  return {
    base: './',
    plugins: [
      glsl(),
      dts({ 
        insertTypesEntry: true,
        include: ['src/library/**', 'src/index.ts']
      })
    ],
    build: isLibrary 
      ? {
          emptyOutDir: false,
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
        }
      : {
          emptyOutDir: true,
          outDir: 'dist',
          rollupOptions: {
            input: {
              main: resolve(__dirname, 'index.html'),
            },
          },
        },
  };
});
