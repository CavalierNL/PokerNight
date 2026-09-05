import { leesBackup, maakBackup, type Avond, type Backup } from '../domain/klassement'

/**
 * Het klassement als bestand, in en uit.
 *
 * Bestaat omdat `localStorage` het niet houdt. Safari wist sinds iOS 13.4 alle
 * script-writable storage na zeven dagen zonder bezoek aan de site, en een
 * pokeravond is maandelijks — in een gewoon tabblad is het klassement dus
 * waarschijnlijk elke keer weg voordat je opnieuw speelt. Op het startscherm
 * gezet telt de app zijn eigen dagen en valt hij buiten die regel, maar dat is
 * een aanname over hoe iemand hem gebruikt en geen garantie. Verder helpt geen
 * enkele browserinstelling tegen een nieuw toestel of gewiste browserdata.
 *
 * Een bestand wel. Geen backend en geen account, dus binnen de opzet van deze
 * app, en de uitslagen blijven waar de gebruiker ze zelf neerzet.
 */

/** Twee cijfers, zodat de bestandsnamen op datum sorteren. */
function tweecijferig(getal: number): string {
  return String(getal).padStart(2, '0')
}

/**
 * De datum in de naam, zodat twee exports niet op elkaar lijken en je in een
 * map ziet welke de nieuwste is. Lokale tijd: de naam hoort te kloppen met de
 * dag waarop je speelde, niet met UTC.
 */
export function bestandsnaam(nu: number): string {
  const d = new Date(nu)
  return `pokernight-klassement-${d.getFullYear()}-${tweecijferig(d.getMonth() + 1)}-${tweecijferig(d.getDate())}.json`
}

export function bewaarAlsBestand(
  avonden: readonly Avond[],
  spelers: readonly string[],
  nu: number,
): void {
  const inhoud = JSON.stringify(maakBackup(avonden, spelers), null, 2)
  const url = URL.createObjectURL(new Blob([inhoud], { type: 'application/json' }))

  const link = document.createElement('a')
  link.href = url
  link.download = bestandsnaam(nu)
  link.click()

  // Niet meteen vrijgeven: `click` start de download, maar de browser leest de
  // blob daarna pas uit, en in sommige browsers breekt een directe revoke hem af.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Geeft `null` als het bestand stuk is of niet van deze app. */
export async function leesBestand(bestand: File): Promise<Backup | null> {
  try {
    return leesBackup(JSON.parse(await bestand.text()))
  } catch {
    return null
  }
}
