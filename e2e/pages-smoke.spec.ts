import { expect, test, type Page } from '@playwright/test'

/**
 * Rooktest tegen de gepubliceerde site, niet tegen een lokale build. Vangt de
 * fouten die alleen op GitHub Pages opduiken: een verkeerde base waardoor de
 * bundel of de sprites 404 geven, of een deploy die wel slaagt maar een oude
 * versie blijft serveren.
 *
 * Draait ná de deploy, dus een kapotte site staat op dat moment al live. De
 * winst is dat het zichtbaar wordt in plaats van stil te blijven; het houdt de
 * publicatie niet tegen.
 */

/**
 * Verzamelt alles wat er tijdens het laden misgaat. Drie bronnen, want ze
 * dekken elk iets anders af:
 *  - `response` vangt 404's op assets die er wel doorheen komen;
 *  - `requestfailed` vangt verzoeken die nooit een antwoord krijgen (DNS,
 *    verbroken verbinding, een CSP-blokkade) en dus geen response opleveren;
 *  - `console` met type error vangt de crash die de ErrorBoundary opslikt —
 *    die vangt render-fouten af en logt ze, waardoor `pageerror` juist níét
 *    afgaat.
 */
function verzamelProblemen(page: Page): string[] {
  const problemen: string[] = []
  page.on('response', (respons) => {
    if (respons.status() >= 400) problemen.push(`${respons.status()} ${respons.url()}`)
  })
  page.on('requestfailed', (verzoek) => {
    problemen.push(`mislukt verzoek: ${verzoek.url()} (${verzoek.failure()?.errorText})`)
  })
  page.on('console', (bericht) => {
    if (bericht.type() === 'error') problemen.push(`consolefout: ${bericht.text()}`)
  })
  page.on('pageerror', (fout) => problemen.push(`scriptfout: ${fout.message}`))
  return problemen
}

// Serieel: slaat de site nog de vorige versie op, dan zeggen de tests daarna
// niets zinnigs meer en kunnen ze beter overgeslagen worden.
test.describe.serial('de gepubliceerde site', () => {
  test('serveert de commit die zojuist gebouwd is', async ({ page }) => {
    const sha = process.env.GITHUB_SHA
    test.skip(!sha, 'Alleen zinvol in CI, waar GITHUB_SHA de gedeployde commit is.')

    // Pages heeft na een deploy soms even nodig voordat de nieuwe versie overal
    // via de CDN te zien is. Hier wachten we daar echt op, in plaats van te
    // hopen dat een retry zonder wachttijd het oplost.
    await expect
      .poll(
        async () => {
          await page.goto('./', { waitUntil: 'domcontentloaded' })
          return page.locator('meta[name="build-sha"]').getAttribute('content')
        },
        { timeout: 120_000, intervals: [2_000] },
      )
      .toBe(sha)
  })

  test('laadt het setupscherm zonder ontbrekende bestanden', async ({ page, baseURL }) => {
    const problemen = verzamelProblemen(page)

    await page.goto('./')

    await expect(page).toHaveTitle('PokerNight')
    await expect(page.getByRole('heading', { name: 'PokerNight' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Toernooi', exact: true })).toBeVisible()

    // Achter de voordeur zit het formulier met de gerekende blindstructuur.
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Start het toernooi' })).toBeVisible()
    // Een bestand uit public/ los opvragen. De browser haalt het favicon in
    // headless niet op, dus zonder deze controle blijft een verkeerde base voor
    // statische bestanden onopgemerkt.
    const favicon = await page.request.get(new URL('sprites/fiche.png', baseURL).href)
    expect(favicon.status(), 'favicon onder de juiste base').toBe(200)
    // De blinds komen uit de rekenkern; cijfers bewijzen dat die echt gedraaid
    // heeft en niet alleen de tabelopmaak is gerenderd.
    await expect(page.locator('tbody tr').first()).toContainText(/\d+\s*\/\s*\d+/)

    expect(problemen).toEqual([])
  })

  test('levert een installeerbaar manifest met werkende iconen', async ({ page, baseURL }) => {
    // Het manifest en zijn iconen staan in public/ en krijgen hun pad van de
    // base. Precies het soort verwijzing dat stilletjes breekt: de app werkt
    // gewoon, maar "op je beginscherm zetten" doet het dan niet meer.
    const manifestUrl = new URL('manifest.webmanifest', baseURL).href
    const respons = await page.request.get(manifestUrl)
    expect(respons.status(), 'manifest onder de juiste base').toBe(200)

    const manifest = await respons.json()
    expect(manifest.display).toBe('fullscreen')
    expect(manifest.icons.length).toBeGreaterThan(0)

    for (const icoon of manifest.icons) {
      const icoonRespons = await page.request.get(new URL(icoon.src, manifestUrl).href)
      expect(icoonRespons.status(), icoon.src).toBe(200)
    }
  })

  test('start een toernooi en toont de klok met de blinds', async ({ page }) => {
    const problemen = verzamelProblemen(page)

    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByRole('button', { name: 'Start het toernooi' }).click()

    // Het toernooischerm is een tweede laadpad met een eigen render en een
    // schrijfactie naar localStorage, die geen van beide in het setupscherm
    // langskomen. De klok telt af, dus alleen de vorm is te vastleggen.
    await expect(page.locator('.tafel__klok')).toHaveText(/^\d+:\d{2}$/)
    await expect(page.locator('.tafel__blinds')).toHaveText(/^\d+ \/ \d+$/)

    expect(problemen).toEqual([])
  })
})
