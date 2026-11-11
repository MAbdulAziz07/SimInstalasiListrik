import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Memakai Microsoft Edge yang sudah terpasang, tanpa mengunduh browser.
    channel: 'msedge',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
});
