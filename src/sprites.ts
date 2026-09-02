/**
 * Pad naar een sprite in `public/sprites`. Gaat via BASE_URL omdat GitHub Pages
 * de site onder het reponaam serveert. Vite herschrijft asset-paden in index.html
 * wel, maar niet paden die hier in TypeScript worden samengesteld: die zouden
 * met een leidende / op de domeinroot uitkomen.
 */
export function sprite(naam: string): string {
  return `${import.meta.env.BASE_URL}sprites/${naam}`
}
