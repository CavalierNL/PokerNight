/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base moet het reponaam zijn: GitHub Pages serveert de site op /poker-night/
export default defineConfig({
  plugins: [react()],
  base: '/poker-night/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
