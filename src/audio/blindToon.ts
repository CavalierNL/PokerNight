/**
 * De toon bij een blindverhoging. Aan tafel wordt gepraat en niemand kijkt naar
 * het scherm, dus dit signaal is belangrijker dan het lijkt.
 *
 * Bewust met de Web Audio API in plaats van een geluidsbestand: geen download,
 * geen asset die kan ontbreken.
 *
 * Staat los van de hook zodat de testknop in de instellingen exact hetzelfde
 * afspeelt als wat je straks aan tafel hoort — een knop die zijn eigen toon
 * maakt, test niets.
 */
export function speelBlindToon(): void {
  try {
    const context = new AudioContext()

    // Het autoplay-beleid laat de constructor slagen maar levert een context in
    // de toestand 'suspended': er komt dan geen geluid uit, zonder dat er iets
    // gegooid wordt. Vandaar deze expliciete hervatting.
    if (context.state === 'suspended') void context.resume().catch(() => {})

    const nu = context.currentTime
    // Twee korte tonen, een kwint uit elkaar — hoorbaar boven gepraat uit.
    for (const [start, frequentie] of [
      [0, 660],
      [0.18, 990],
    ] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = frequentie
      oscillator.type = 'triangle'
      gain.gain.setValueAtTime(0.0001, nu + start)
      gain.gain.exponentialRampToValueAtTime(0.3, nu + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, nu + start + 0.16)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(nu + start)
      oscillator.stop(nu + start + 0.18)
    }
    setTimeout(() => void context.close().catch(() => {}), 1000)
  } catch {
    // Geen Web Audio in deze browser: dan blijft het stil, en dat is te overzien.
  }
}
