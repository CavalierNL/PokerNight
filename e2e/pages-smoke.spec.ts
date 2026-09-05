import { readFile } from 'node:fs/promises'
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

/**
 * Start een toernooi en zet de tafel. Elk toernooi begint bij het scherm met de
 * tafelindeling; pas als die weggeklikt is loopt de klok en zijn de knoppen
 * eronder bereikbaar.
 */
async function startEnGaZitten(page: Page) {
  await page.getByRole('button', { name: 'Start het toernooi' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
}

// Serieel: slaat de site nog de vorige versie op, dan zeggen de tests daarna
// niets zinnigs meer en kunnen ze beter overgeslagen worden.
test.describe.serial('de gepubliceerde site', () => {
  test('serveert de commit die zojuist gebouwd is', async ({ page }) => {
    const sha = process.env.GITHUB_SHA
    test.skip(!sha, 'Alleen zinvol in CI, waar GITHUB_SHA de gedeployde commit is.')

    // Ruimer dan de 60 seconden uit de config, anders kapt de test zelf de poll
    // hieronder af en leest een trage publicatie als een mislukte.
    test.setTimeout(360_000)

    // Pages heeft na een deploy soms even nodig voordat de nieuwe versie overal
    // via de CDN te zien is. Hier wachten we daar echt op, in plaats van te
    // hopen dat een retry zonder wachttijd het oplost.
    //
    // Ruim genomen omdat we naar een branch publiceren: onze workflow is klaar
    // zodra de push door is, maar daarna draait GitHub nog zijn eigen build over
    // gh-pages. Die stap zit niet in onze wachtketen, dus hij valt volledig
    // binnen deze poll.
    //
    // Alleen de eerste poging wacht zo lang. Playwright herstart bij een fout het
    // hele serial-blok, dus zonder deze knik zou een publicatie die een kwartier
    // duurt op de derde poging alsnog groen worden — een echte regressie in de
    // deploypijplijn die dan als "even geduld" voorbijkomt.
    const wachtMs = test.info().retry === 0 ? 300_000 : 30_000

    await expect
      .poll(
        async () => {
          // Via `request` en niet via `goto`, om twee redenen. `expect.poll`
          // roept de callback buiten zijn eigen try aan, dus een navigatiefout —
          // DNS, connection reset, een timeout — zou de test meteen laten falen
          // in plaats van het opnieuw te proberen, en juist vlak na een push is
          // dat het waarschijnlijkste. En Pages stuurt max-age=600 op HTML, dus
          // een index.html die in de cache belandt zou de poll zijn hele duur
          // vastpinnen; langer wachten helpt daar per definitie niet tegen.
          try {
            const respons = await page.request.get('./', {
              headers: { 'cache-control': 'no-cache' },
            })
            const html = await respons.text()
            return /<meta[^>]*name="build-sha"[^>]*content="([^"]*)"/.exec(html)?.[1] ?? null
          } catch {
            // Nog niet bereikbaar; volgende ronde opnieuw.
            return null
          }
        },
        { timeout: wachtMs, intervals: [5_000] },
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

  test('laat de terug-toets hetzelfde doen als de Terug-knop', async ({ page }) => {
    // Op een telefoon met de app op het beginscherm is de systeem-terugveeg de
    // enige terugweg; die moet dus op de geschiedenis werken en niet de app
    // afsluiten.
    await page.goto('./')
    await page.getByRole('button', { name: 'Pokerdozen' }).click()
    await expect(page.getByRole('heading', { name: 'Pokerdozen' })).toBeVisible()

    await page.goBack()
    await expect(page.getByRole('button', { name: 'Toernooi', exact: true })).toBeVisible()

    // Vanaf een lang scherm dat ver doorgescrold is moet terug ook echt van
    // scherm wisselen, en niet alleen naar boven springen.
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.mouse.wheel(0, 4000)
    await expect(page.getByRole('button', { name: 'Start het toernooi' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('button', { name: 'Pokerdozen' })).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    // En de knop zelf doet precies hetzelfde.
    await page.getByRole('button', { name: 'Instellingen' }).click()
    await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible()
    await page.getByRole('button', { name: 'Terug' }).click()
    await expect(page.getByRole('button', { name: 'Toernooi', exact: true })).toBeVisible()
  })

  test('laat een leeggemaakt getalveld leeg in plaats van er 0 in te zetten', async ({
    page,
  }) => {
    // Number('') is 0, en een duur van 0 is even fout als geen duur. Wie het veld
    // leegmaakt om iets nieuws te typen moet geen 0 hoeven wegpoetsen.
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()

    const duur = page.getByLabel('Speelduur (minuten)')
    await expect(duur).toHaveValue('90')
    await duur.fill('')
    await expect(duur).toHaveValue('')

    await duur.fill('120')
    await expect(duur).toHaveValue('120')
    // De blindstructuur rekent mee: acht levels van 15 minuten.
    await expect(page.locator('tbody tr')).toHaveCount(8)
  })

  test('laat de duur het aantal levels en de stack bepalen', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()

    // Zes levels van vijftien minuten, en een stack die dat ook echt haalt.
    await expect(page.getByLabel('Aantal levels')).toHaveValue('15')
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('12500')
    await expect(page.locator('tbody tr')).toHaveCount(6)

    // Langer spelen vraagt een diepere stack, met dezelfde beginblinds.
    // Acht levels die elk verdubbelen: 25.000 diep.
    await page.getByLabel('Speelduur (minuten)').fill('120')
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('25000')
    await expect(page.locator('tbody tr').first()).toContainText('25 / 50')

    // Het voorstel blijft volgen zolang je zelf niets kiest.
    await page.getByLabel('Speelduur (minuten)').fill('90')
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('12500')

    // Zodra je aan de blindstructuur komt, blijft het bedrag staan waar het staat.
    await page.getByLabel('Hoe de blinds groeien').selectOption('calculated')
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('12500')

    // Zonder eindtijd loopt de reeks door tot het toernooi beslist is.
    await page.getByLabel('Hoe de blinds groeien').selectOption('doubling')
    await page.getByLabel('Wanneer het klaar is').selectOption('lms')
    await expect(page.getByLabel('Speelduur (minuten)')).toHaveCount(0)
    await expect(page.getByText('tot er één speler over is')).toBeVisible()
  })

  test('biedt de 1-2-5 reeks alleen aan waar die iets oplevert', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()

    // De toernooidoos begint met 25 en 50; daar legt 100/200 net zo makkelijk
    // als 125/250, dus de reeks voegt niets toe.
    const reeks = page.getByLabel('Hoe de blinds groeien')
    await expect(reeks.locator('option')).toHaveCount(2)
    await expect(reeks).toHaveValue('doubling')

    // Met de huisregel wordt de doos 1 en 5, en dan verdient de reeks zijn plek.
    await page.getByText('Huisregel: één kleur is 5').click()
    await expect(reeks.locator('option')).toHaveCount(3)
    await reeks.selectOption('ladder')
    await expect(page.locator('tbody tr').nth(2)).toContainText('5 / 10')
  })

  test('houdt de klok stil tot een levelovergang bevestigd is', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    // De standaard is "op de klok én als iemand eruit gaat": één klik zet dus
    // een level om, en de klok telt af zodat je kunt zien dat hij stilstaat.
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Speler 1' }).click()
    await expect(page.getByText('Level 2', { exact: true })).toBeVisible()

    // De klok staat stil op de volle levellengte tot er bevestigd is.
    await expect(page.locator('.tafel__klok')).toHaveText('15:00')
    await page.waitForTimeout(1200)
    await expect(page.locator('.tafel__klok')).toHaveText('15:00')

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0)
    await expect(page.locator('.tafel__klok')).not.toHaveText('15:00')
  })

  test('hervat een pauze door op het scherm te tikken', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Pauze' }).click()
    await expect(page.getByText('GEPAUZEERD')).toBeVisible()

    // Geen knop om te mikken: het hele scherm hervat.
    await page.getByRole('button', { name: 'Hervatten' }).click()
    await expect(page.getByText('GEPAUZEERD')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Pauze' })).toBeEnabled()
  })

  test('volgt het stackvoorstel ook na een eerder toernooi', async ({ page }) => {
    // De app onthoudt je vorige opzet. Was het bedrag toen het voorstel, dan hoort
    // het veld daarna gewoon weer mee te schuiven met wat je verandert.
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('12500')
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Stoppen' }).click()
    await page.getByRole('button', { name: 'Ja, stop het toernooi' }).click()
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()

    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('12500')
    // Drie levels van dertig minuten vragen met acht spelers 1250.
    await page.getByLabel('Aantal levels').selectOption('30')
    await expect(page.getByLabel('Startstack (chips)')).toHaveValue('1250')
  })

  test('start een toernooi en toont de klok met de blinds', async ({ page }) => {
    const problemen = verzamelProblemen(page)

    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await startEnGaZitten(page)

    // Het toernooischerm is een tweede laadpad met een eigen render en een
    // schrijfactie naar localStorage, die geen van beide in het setupscherm
    // langskomen. De klok telt af, dus alleen de vorm is te vastleggen.
    await expect(page.locator('.tafel__klok')).toHaveText(/^\d+:\d{2}$/)
    // Small en big staan als benoemde bedragen naast elkaar.
    await expect(page.locator('.tafel__blind').first()).toContainText(/Small\s*\d+/)
    await expect(page.locator('.tafel__blind').last()).toContainText(/Big\s*\d+/)

    expect(problemen).toEqual([])
  })

  test('sluit het toernooi af met een winnaar en een uitslag', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Namen, één per regel').fill('Ann\nBob\n')
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Ann' }).click()

    await expect(page.getByText('Afgelopen')).toBeVisible()
    await expect(page.locator('.eindscherm__winnaar')).toHaveText('Bob')
    // De uitslag loopt van winnaar naar wie het eerst uitviel.
    await expect(page.locator('.eindscherm__uitslag li')).toHaveText(['Bob', 'Ann'])
  })

  test('toont het hele schema met het huidige level erin', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Hele schema' }).click()
    await expect(page.locator('.schema .structuur__nu')).toContainText('1')

    // De klok loopt door terwijl je opzoekt: dit is geen pauze.
    await expect(page.getByText('GEPAUZEERD')).toHaveCount(0)
    // In het venster zelf: de achtergrond eromheen sluit ook, en heet net zo.
    await page.locator('.schema').getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.locator('.schema')).toHaveCount(0)
  })

  test('gaat een level terug zonder er meteen weer doorheen te schieten', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Een level vooruit' }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.locator('.tafel__level')).toContainText('Level 2')

    await page.getByRole('button', { name: 'Een level terug' }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.locator('.tafel__level')).toContainText('Level 1')

    // Het teruggekregen level begint vol; stond de klok op nul, dan zou de
    // eerstvolgende tik hem meteen weer vooruit zetten.
    await page.waitForTimeout(1200)
    await expect(page.locator('.tafel__level')).toContainText('Level 1')
  })

  test('loot de tafel en wacht met de klok tot iedereen zit', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByRole('button', { name: 'Start het toernooi' }).click()

    // Acht plaatsen in een geloote volgorde, met plaats een als dealer.
    await expect(page.locator('.loting__plaatsen li')).toHaveCount(8)
    await expect(page.locator('.loting__eerste')).toHaveCount(1)
    await expect(page.locator('.tafel__klok')).toHaveText('15:00')
    await page.waitForTimeout(1200)
    await expect(page.locator('.tafel__klok')).toHaveText('15:00')

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.locator('.tafel__klok')).not.toHaveText('15:00')
  })

  test('zoekt de rangorde van de handen op', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Wat wint?' }).click()
    await expect(page.locator('.handen__regel')).toHaveCount(10)
    await expect(page.locator('.handen__regel').first()).toContainText('Royal flush')
    await expect(page.locator('.handen__regel').last()).toContainText('High card')
    // Bij elke hand de twee kansen uit de rekenkern, niet alleen de opmaak.
    await expect(page.locator('.handen__regel').last()).toContainText('50%→17%')

    // Opzoeken is geen pauze: de klok loopt door.
    await expect(page.getByText('GEPAUZEERD')).toHaveCount(0)
    await page.locator('.schema').getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.locator('.handen')).toHaveCount(0)
  })

  test('telt afgeronde avonden op in het klassement', async ({ page }) => {
    async function speelAvond(winnaar: string, verliezer: string) {
      await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
      await page.getByLabel('Namen, één per regel').fill(`${winnaar}\n${verliezer}\n`)
      await startEnGaZitten(page)
      await page.getByRole('button', { name: verliezer }).click()
      await expect(page.locator('.eindscherm__winnaar')).toHaveText(winnaar)
      await page.getByRole('button', { name: 'Klaar' }).click()
    }

    await page.goto('./')
    await speelAvond('Yara', 'Xander')

    await page.getByRole('button', { name: 'Klassement' }).click()
    const yara = page.locator('.stand__regel', { hasText: 'Yara' })
    const xander = page.locator('.stand__regel', { hasText: 'Xander' })
    // Twee spelers, dus de winnaar krijgt er twee en de verliezer één.
    await expect(yara.locator('.stand__punten')).toHaveText('2')
    await expect(xander.locator('.stand__punten')).toHaveText('1')
    await expect(yara).toContainText('1 avond')
    await expect(yara).toContainText('1× gewonnen')

    // De overwinning staat met datum in de hall of fame.
    const vandaag = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    await expect(page.locator('.fame__regel')).toHaveCount(1)
    await expect(page.locator('.fame__regel').first()).toContainText('Yara')
    await expect(page.locator('.fame__regel').first()).toContainText(vandaag)

    // Een tweede avond, nu andersom. Optellen over avonden is het enige wat
    // dit scherm doet en zonder een tweede avond blijft dat ongedekt.
    await page.getByRole('button', { name: 'Terug' }).click()
    await speelAvond('Xander', 'Yara')
    await page.getByRole('button', { name: 'Klassement' }).click()

    // Allebei 3 punten en één overwinning, dus de naam beslist: Xander boven Yara.
    await expect(yara.locator('.stand__punten')).toHaveText('3')
    await expect(xander.locator('.stand__punten')).toHaveText('3')
    await expect(page.locator('.stand__regel').first()).toContainText('Xander')
    await expect(yara).toContainText('2 avonden')
    await expect(page.locator('.fame__regel')).toHaveCount(2)
  })

  test('bewaart het klassement in een bestand en leest het terug', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Namen, één per regel').fill('Pim\nQuinn\n')
    await startEnGaZitten(page)
    await page.getByRole('button', { name: 'Quinn' }).click()

    // Opslaan kan meteen op het eindscherm: dat is het moment waarop er iets
    // nieuws te bewaren is en iedereen nog om de tafel zit.
    const wachtOpDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Klassement opslaan' }).click()
    const download = await wachtOpDownload

    expect(download.suggestedFilename()).toMatch(/^pokernight-klassement-\d{4}-\d{2}-\d{2}\.json$/)
    const pad = await download.path()
    const inhoud = JSON.parse(await readFile(pad, 'utf8'))
    expect(inhoud.app).toBe('pokernight')
    expect(inhoud.avonden).toHaveLength(1)
    expect(inhoud.avonden[0].uitslag).toEqual(['Pim', 'Quinn'])

    await page.getByRole('button', { name: 'Klaar' }).click()

    // Nu het klassement leegmaken alsof de browser het gewist heeft, en het
    // bestand terugzetten.
    await page.evaluate(() => localStorage.removeItem('pokernight.avonden'))
    await page.reload()
    await page.getByRole('button', { name: 'Klassement' }).click()
    await expect(page.getByText('Nog geen avond gespeeld')).toBeVisible()

    await page.locator('.bewaren__inlezen input').setInputFiles(pad)
    await expect(page.getByText('1 avond ingelezen en samengevoegd.')).toBeVisible()
    await expect(page.locator('.stand__regel', { hasText: 'Pim' })).toContainText('2')

    // Nog een keer hetzelfde bestand mag niets verdubbelen.
    await page.locator('.bewaren__inlezen input').setInputFiles(pad)
    await expect(page.locator('.fame__regel')).toHaveCount(1)
  })

  test('houdt een vaste spelerslijst bij die het setupscherm aanbiedt', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Klassement' }).click()

    await page.getByLabel('Naam erbij').fill('Nour')
    await page.getByRole('button', { name: 'Toevoegen' }).click()
    await expect(page.locator('.vastelijst__regel', { hasText: 'Nour' })).toBeVisible()

    // Terug naar het setupscherm: de naam is daar aan te tikken, en komt dan in
    // het namenveld te staan. Dat is de hele reden dat de lijst bestaat — zo
    // wordt de schrijfwijze elke avond dezelfde.
    await page.getByRole('button', { name: 'Terug' }).click()
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    const namen = page.getByLabel('Namen, één per regel')
    await namen.fill('Ann\n')
    await page.getByRole('button', { name: 'Nour' }).click()
    // Met de afsluitende lege regel erachter: daar staat de cursor klaar voor de
    // volgende naam, en die hoort een aangetikte naam niet weg te poetsen.
    await expect(namen).toHaveValue('Ann\nNour\n')

    // Nog een keer tikken haalt hem er weer uit.
    await page.getByRole('button', { name: 'Nour' }).click()
    await expect(namen).toHaveValue('Ann\n')

    // En de lijst overleeft een herlaadbeurt. Zonder deze controle zou
    // saveSpelers volledig kunnen wegvallen zonder dat één test het merkt.
    await page.reload()
    await page.getByRole('button', { name: 'Klassement' }).click()
    await expect(page.locator('.vastelijst__regel', { hasText: 'Nour' })).toBeVisible()
  })

  test('rekent side pots uit voor de spelers aan tafel', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Namen, één per regel').fill('Ann\nBob\nCem\n')
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Side pots' }).click()
    // De namen komen uit het toernooi, dus je tikt alleen bedragen in.
    await expect(page.locator('.potinvoer__regel')).toHaveCount(3)

    await page.getByLabel('Inzet van Ann').fill('200')
    await page.getByLabel('Inzet van Bob').fill('200')
    await page.getByLabel('Inzet van Cem').fill('50')

    // Cem kon maar 50 mee: een hoofdpot van 150 waar hij om meespeelt, en een
    // side pot van 300 waar alleen Ann en Bob om spelen. De totaalregel deelt de
    // klasse met de potten, dus die hoort er hier niet bij.
    const potten = page.locator('.potten__regel:not(.potten__regel--totaal)')
    await expect(potten).toHaveCount(2)

    // Wie er om speelt, niet in welke volgorde: de tafel wordt geloot, dus de
    // zitvolgorde — en daarmee de volgorde in deze regel — verschilt per run.
    const kanshebbers = async (index: number) =>
      (await potten.nth(index).locator('.potten__spelers').innerText())
        .split(',')
        .map((naam) => naam.trim())
        .sort()

    await expect(potten.first()).toContainText('150')
    expect(await kanshebbers(0)).toEqual(['Ann', 'Bob', 'Cem'])
    await expect(potten.last()).toContainText('300')
    expect(await kanshebbers(1)).toEqual(['Ann', 'Bob'])

    // De labels: welke pot de hoofdpot is bepaalt aan tafel waar het geld heen
    // gaat, dus dat mag niet stilletjes omdraaien.
    await expect(potten.nth(0).locator('.potten__naam')).toHaveText('Hoofdpot')
    await expect(potten.nth(1).locator('.potten__naam')).toHaveText('Side pot 1')

    // Het totaal is de controle die aan tafel telt: klopt dit met wat er ligt?
    await expect(page.locator('.potten__regel--totaal .potten__bedrag')).toHaveText('450')

    // Wie folt betaalt mee maar dingt niet mee. Cem legde 50 in en Ann en Bob
    // allebei 200, dus zonder Cem als kanshebber spelen boven én onder zijn
    // niveau dezelfde twee mensen: één pot van 450 in plaats van twee.
    await page.getByRole('button', { name: 'Fold voor Cem' }).click()
    await expect(potten).toHaveCount(1)
    await expect(potten.first().locator('.potten__bedrag')).toHaveText('450')
    expect(await kanshebbers(0)).toEqual(['Ann', 'Bob'])

    // Opzoeken is geen pauze: de klok loopt door.
    await expect(page.getByText('GEPAUZEERD')).toHaveCount(0)
    await page.locator('.schema').getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.locator('.potinvoer')).toHaveCount(0)
  })

  test('houdt twee spelers met dezelfde naam uit elkaar', async ({ page }) => {
    // Namen zijn niet uniek — het setupscherm trimt ze alleen. Op naam
    // gesleutelde invoer liet beide Jannen aan één veld hangen, met een pot die
    // twee keer zo groot was als hij hoorde.
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Namen, één per regel').fill('Jan\nJan\nBob\n')
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Side pots' }).click()
    const velden = page.locator('.potinvoer__bedrag')
    await velden.nth(0).fill('50')
    await velden.nth(1).fill('200')
    await velden.nth(2).fill('200')

    // Het eerste veld mag niet zijn meegesprongen met het tweede.
    await expect(velden.nth(0)).toHaveValue('50')

    // Hoofdpot 150 waar alle drie om spelen, side pot 300 voor de andere twee.
    const potten = page.locator('.potten__regel:not(.potten__regel--totaal)')
    await expect(potten).toHaveCount(2)
    await expect(potten.nth(0).locator('.potten__bedrag')).toHaveText('150')
    await expect(potten.nth(1).locator('.potten__bedrag')).toHaveText('300')
    await expect(page.locator('.potten__regel--totaal .potten__bedrag')).toHaveText('450')

    await page.locator('.schema').getByRole('button', { name: 'Sluiten' }).click()
  })

  test('toont wisselgeld apart van de potten', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Namen, één per regel').fill('Ann\nBob\n')
    await startEnGaZitten(page)

    await page.getByRole('button', { name: 'Side pots' }).click()
    await page.getByLabel('Inzet van Ann').fill('500')
    await page.getByLabel('Inzet van Bob').fill('200')

    // Ann ging hoger dan Bob kon volgen: 400 in de pot, 300 terug naar Ann. Dat
    // is geen pot om te winnen maar wisselgeld, en hoort dus apart te staan.
    const terug = page.locator('.potten__regel--terug')
    await expect(terug.locator('.potten__bedrag')).toHaveText('300')
    await expect(terug.locator('.potten__spelers')).toHaveText('Ann')
    await expect(page.locator('.potten__regel--totaal .potten__bedrag')).toHaveText('700')

    await page.locator('.schema').getByRole('button', { name: 'Sluiten' }).click()
  })

  test('laat een laatkomer instappen', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Toernooi', exact: true }).click()
    await page.getByLabel('Laatkomers mogen instappen').check()
    await startEnGaZitten(page)

    await expect(page.getByText('8 spelers')).toBeVisible()
    await page.getByRole('button', { name: '+ speler' }).click()
    await page.getByLabel('Naam').fill('Nour')
    await page.getByRole('button', { name: 'Erbij' }).click()

    await expect(page.getByText('9 spelers')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nour' })).toBeVisible()
  })
})
