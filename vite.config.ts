import { defineConfig } from 'vite';
import { externalizer } from '@plenny/vite-externalizer';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    externalizer(),
    dts({ rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: {
        visitor: 'resources/js/visitor.ts',
        server: 'resources/js/server.ts',
      },
      formats: ['es', 'cjs'],
    },
    minify: 'terser',
  },
});
