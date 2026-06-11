/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// GitHub Pages는 /<repo>/ 하위 경로로 서빙되므로 build 시에만 base를 붙인다.
// (dev 서버는 '/' 루트 유지)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/priorityq/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
