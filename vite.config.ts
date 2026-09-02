/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serveert een projectsite onder /<reponaam>/, dus daar moet base
// op staan. In CI leiden we dat af uit GITHUB_REPOSITORY: hernoem je de repo,
// dan verhuist de base mee in plaats van stilletjes alle assets te breken.
// Lokaal (dev en preview) draait de site gewoon op /.
const repoNaam = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  plugins: [react()],
  base: repoNaam ? `/${repoNaam}/` : '/',
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
