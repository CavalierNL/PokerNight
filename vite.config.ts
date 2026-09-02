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
  base: repoNaam ? `/${repoNaam}/` : '/',
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
