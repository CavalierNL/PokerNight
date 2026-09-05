/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serveert een *projectsite* onder /<reponaam>/, dus daar moet base
// op staan. In CI leiden we dat af uit GITHUB_REPOSITORY, dat GitHub Actions
// zelf zet; hernoem je de repo, dan verhuist de base mee. Let op: voor een
// gebruikerssite (<owner>.github.io) of een eigen domein via CNAME serveert
// Pages op /, en moet base handmatig op '/' — die gevallen vangt dit niet.
// Lokaal (dev en preview) is de variabele leeg en draait de site op /.
const repoNaam = process.env.GITHUB_REPOSITORY?.split('/')[1]

// Een PR-preview staat dieper: /<reponaam>/pr-preview/pr-<n>/. Die base zit in
// de bundel gebakken, dus dezelfde build is niet op twee plekken te gebruiken en
// de previewworkflow zet hem hier. Leeg betekent: de gewone site.
const previewBase = process.env.PAGES_BASE

// De vorm van dit pad is een afspraak tussen drie bestanden: preview.yml zet
// hem, hier komt hij binnen, en naamruimte() in src/state/storage.ts leest er de
// PR uit om de opslag van de echte site gescheiden te houden. Herkent die functie
// het pad niet, dan valt de preview stil terug op de productieopslag — geen
// foutmelding, wel een preview die over een lopend toernooi heen schrijft.
// Daarom hier hard weigeren in plaats van daar stil terugvallen.
if (previewBase && !/^\/[^/]+\/pr-preview\/pr-\d+\/$/.test(previewBase)) {
  throw new Error(
    `PAGES_BASE '${previewBase}' heeft niet de vorm /<repo>/pr-preview/pr-<n>/ die naamruimte() herkent`,
  )
}

const base = previewBase || (repoNaam ? `/${repoNaam}/` : '/')

// De commit die gebouwd is, als meta-tag in de HTML. Daarmee kan de rooktest
// zien of hij de zojuist gepubliceerde versie te pakken heeft of nog een oude
// uit de CDN-cache. Staat in de HTML zelf, dus leesbaar zonder dat de bundel al
// gedraaid heeft.
const buildSha = process.env.GITHUB_SHA ?? 'lokaal'

function stempelBuildSha() {
  return {
    name: 'stempel-build-sha',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { name: 'build-sha', content: buildSha },
        injectTo: 'head' as const,
      },
    ],
  }
}

export default defineConfig({
  plugins: [react(), stempelBuildSha()],
  base,
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
