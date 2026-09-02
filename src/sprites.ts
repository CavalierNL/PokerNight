/**
 * Pad naar een sprite in `public/sprites`. Gaat via BASE_URL omdat GitHub Pages
 * de site op /poker-night/ serveert — een pad dat met / begint laadt daar niet.
 */
export function sprite(naam: string): string {
  return `${import.meta.env.BASE_URL}sprites/${naam}`
}
