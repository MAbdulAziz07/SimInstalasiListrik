import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Jalur relatif agar hasil build berjalan di sub-jalur GitHub Pages.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Tes komponen memakai jsdom dan bisa lambat di mesin yang sedang sibuk.
    testTimeout: 20000,
    // Tes anggaran waktu tidak berlaku saat kode diinstrumentasi untuk mengukur cakupan.
    env: { VITE_COVERAGE: process.argv.includes('--coverage') ? '1' : '' },
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/sim/**'],
      thresholds: { lines: 90 },
    },
  },
});
