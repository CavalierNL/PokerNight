import { defineConfig, devices } from '@playwright/test'

// PAGE_URL wordt door de deploy-workflow gevuld met de echte Pages-URL.
// Zonder die variabele test je een lokale `npm run preview`.
const baseURL = process.env.PAGE_URL ?? 'http://localhost:4173/'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // Pages heeft na een deploy soms een paar seconden nodig voordat de nieuwe
  // versie overal via de CDN te zien is.
  retries: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
})
