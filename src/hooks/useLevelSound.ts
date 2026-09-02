import { useEffect, useRef } from 'react'

/**
 * Speelt een korte toon bij elke levelverhoging. Aan tafel wordt gepraat en
 * niemand kijkt naar het scherm, dus dit signaal is belangrijker dan het lijkt.
 * Bewust met de Web Audio API in plaats van een geluidsbestand: geen download,
 * geen asset die kan ontbreken.
 */
export function useLevelSound(levelIndex: number, enabled: boolean): void {
  const vorigeLevel = useRef(levelIndex)

  useEffect(() => {
    if (levelIndex === vorigeLevel.current) return
    vorigeLevel.current = levelIndex
    if (!enabled) return

    try {
      const context = new AudioContext()
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
      setTimeout(() => void context.close(), 1000)
    } catch {
      // Geluid geblokkeerd tot de gebruiker iets aanklikt: geen probleem.
    }
  }, [levelIndex, enabled])
}
