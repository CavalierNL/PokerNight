import { expect, test } from '@playwright/test'

/**
 * Rookttest tegen de gepubliceerde site, niet tegen een lokale build. Vangt de
 * fouten die alleen op GitHub Pages opduiken: een verkeerde base waardoor de
 * bundel of de sprites 404 geven, of een deploy die halverwege is blijven staan.
 */
test('de gepubliceerde site laadt het setupscherm zonder ontbrekende bestanden', async ({
  page,
}) => {
  const problemen: string[] = []
  page.on('response', (respons) => {
    if (respons.status() >= 400) problemen.push(`${respons.status()} ${respons.url()}`)
  })
  page.on('pageerror', (fout) => problemen.push(`scriptfout: ${fout.message}`))

  await page.goto('./', { waitUntil: 'networkidle' })

  await expect(page).toHaveTitle('PokerNight')
  await expect(page.getByRole('heading', { name: 'PokerNight' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start het toernooi' })).toBeVisible()

  expect(problemen).toEqual([])
})

test('de blindstructuur wordt op de live site berekend', async ({ page }) => {
  await page.goto('./', { waitUntil: 'networkidle' })

  // De tabel vult zich alleen als de domeinlogica in de bundel echt draait.
  const eersteLevel = page.locator('tbody tr').first()
  await expect(eersteLevel).toBeVisible()
  await expect(eersteLevel).toContainText('/')
})
