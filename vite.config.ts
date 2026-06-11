import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [vue(), glsl()],
  build: {
    target: 'esnext',
  },
  server: {
    open: true,
  },
});
