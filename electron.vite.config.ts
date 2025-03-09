import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          clicker: resolve(__dirname, 'src/renderer/clicker.html'),
          letters: resolve(__dirname, 'src/renderer/letters.html'),
        },
      },
    },
  },
});
