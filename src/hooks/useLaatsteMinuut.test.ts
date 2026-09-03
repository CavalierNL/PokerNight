import { describe, expect, it } from 'vitest'
import { passeertDeMinuut, WAARSCHUWING_MS } from './useLaatsteMinuut'

describe('passeertDeMinuut', () => {
  it('waarschuwt op de tik waarop de grens gepasseerd wordt', () => {
    expect(passeertDeMinuut(WAARSCHUWING_MS + 250, WAARSCHUWING_MS)).toBe(true)
  })

  it('zwijgt zolang de klok boven de grens staat', () => {
    expect(passeertDeMinuut(90_000, 75_000)).toBe(false)
  })

  it('waarschuwt niet nog een keer onder de grens', () => {
    // Anders piept de laatste minuut vier keer per seconde.
    expect(passeertDeMinuut(45_000, 44_750)).toBe(false)
  })

  it('zwijgt bij een eerste meting binnen de laatste minuut', () => {
    // Zo begint een level dat je opent terwijl het al bijna om is: dan is er
    // niets gepasseerd en weet de tafel het allang.
    expect(passeertDeMinuut(undefined, 30_000)).toBe(false)
  })

  it('waarschuwt ook als de klok in één sprong voorbij de grens gaat', () => {
    // Een slapende telefoon slaat tikken over; dan is de sprong groot en moet
    // de waarschuwing alsnog klinken.
    expect(passeertDeMinuut(120_000, 5_000)).toBe(true)
  })
})
