/**
 * Een reeks korte tonen: per toon het startmoment in seconden en de frequentie.
 */
type Toon = readonly [start: number, frequentie: number]

/**
 * Speelt een reeks tonen af met de Web Audio API. Bewust geen geluidsbestand:
 * geen download, geen asset die kan ontbreken.
 */
function speel(tonen: readonly Toon[], duur = 0.18): void {
  try {
    const context = new AudioContext()

    // Het autoplay-beleid laat de constructor slagen maar levert een context in
    // de toestand 'suspended': er komt dan geen geluid uit, zonder dat er iets
    // gegooid wordt. Vandaar deze expliciete hervatting.
    if (context.state === 'suspended') void context.resume().catch(() => {})

    const nu = context.currentTime
    for (const [start, frequentie] of tonen) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = frequentie
      oscillator.type = 'triangle'
      gain.gain.setValueAtTime(0.0001, nu + start)
      gain.gain.exponentialRampToValueAtTime(0.3, nu + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, nu + start + duur - 0.02)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(nu + start)
      oscillator.stop(nu + start + duur)
    }
    setTimeout(() => void context.close().catch(() => {}), 1000)
  } catch {
    // Geen Web Audio in deze browser: dan blijft het stil, en dat is te overzien.
  }
}

/**
 * De toon bij een blindverhoging. Aan tafel wordt gepraat en niemand kijkt naar
 * het scherm, dus dit signaal is belangrijker dan het lijkt. Twee korte tonen,
 * een kwint uit elkaar — hoorbaar boven gepraat uit.
 *
 * Staat los van de hook zodat de testknop in de instellingen exact hetzelfde
 * afspeelt als wat je straks aan tafel hoort — een knop die zijn eigen toon
 * maakt, test niets.
 */
export function speelBlindToon(): void {
  speel([
    [0, 660],
    [0.18, 990],
  ])
}

/**
 * De waarschuwing dat het level bijna om is. Eén lange lage toon, en daarmee
 * hoorbaar iets anders dan de twee stijgende van een verhoging: deze zegt "maak
 * de hand af", niet "de blinds zijn omhoog". Klinkt eenmalig.
 */
export function speelLaatsteMinuutToon(): void {
  speel([[0, 392]], 0.45)
}

/** Tussenpauze in de herhaling: lang genoeg om niet als alarm te klinken. */
const HERHAAL_MS = 2000

/**
 * Een vangnet. Zonder deze grens piept een laptop die alleen in de kamer staat
 * door tot het volgende level — een kwartier lang.
 */
const MAXIMALE_DUUR_MS = 60_000

/**
 * Herhaalt de toon tot de aanroeper hem stopt, of tot het vangnet afloopt. Geeft
 * de stopfunctie terug; React gebruikt die als opruiming van het effect.
 *
 * Luistert niet meer zelf naar aanrakingen: het geluid hoort bij het scherm dat
 * om bevestiging vraagt, en stopt dus als dát scherm weggaat. Een willekeurige
 * tik op tafel zette het anders stil terwijl de blinds nog niet gezien waren.
 */
export function herhaalBlindToon(): () => void {
  speelBlindToon()

  const herhaling = setInterval(speelBlindToon, HERHAAL_MS)
  let gestopt = false

  const stop = () => {
    if (gestopt) return
    gestopt = true
    clearInterval(herhaling)
    clearTimeout(vangnet)
  }

  const vangnet = setTimeout(stop, MAXIMALE_DUUR_MS)

  return stop
}
