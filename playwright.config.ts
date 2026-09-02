import { defineConfig, devices } from '@playwright/test'

// Lokaal bootsen we de Pages-situatie na met dezelfde base, zodat een padfout
// hier net zo hard faalt als in productie in plaats van pas na de deploy.
const repo = process.env.GITHUB_REPOSITORY || 'CavalierNL/PokerNight'
const lokaleUrl = `http://localhost:4173/${repo.split('/')[1]}/`

// De deploy-workflow vult PAGE_URL met de echte Pages-URL. Zonder die variabele
// start Playwright zelf een build plus previewserver (zie webServer hieronder).
// De trailing slash is niet cosmetisch: de tests navigeren met een relatieve
// './', en zonder slash zou new URL('./', '…/PokerNight') op de domeinroot
// uitkomen en dus stilletjes een heel andere site testen. Daarom '||' en niet
// '??' — een lege PAGE_URL uit de workflow moet ook op de fallback vallen.
const baseURL = (process.env.PAGE_URL || lokaleUrl).replace(/\/?$/, '/')

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Alleen in CI, en zonder de illusie dat dit CDN-propagatie opvangt: retries
  // hebben geen wachttijd. Het wachten op een verse deploy doet de rooktest
  // zelf met een expect.poll op de build-sha.
  retries: process.env.CI ? 2 : 0,
  // De github-reporter schrijft alleen annotaties, geen map. Zonder de
  // html-reporter zou de artifact-upload bij een kapotte deploy leeg zijn.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.PAGE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: lokaleUrl,
        // Bewust niet hergebruiken: een server die nog draait kan een build met
        // een andere base serveren, en juist die fout moet deze test vinden.
        reuseExistingServer: false,
        timeout: 120_000,
        env: { GITHUB_REPOSITORY: repo },
      },
})
