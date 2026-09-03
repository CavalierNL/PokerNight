import { describe, expect, it } from 'vitest'
import { passeertDeGrens, waarschuwingsGrensMs } from './useEindeWaarschuwing'

const MINUUT = 60_000

describe('waarschuwingsGrensMs', () => {
  it('waarschuwt bij een kort level een minuut van tevoren', () => {
    // Twee minuten zou bij vijf minuten bijna het halve level zijn.
    expect(waarschuwingsGrensMs(5)).toBe(MINUUT)
  })

  it('waarschuwt bij tien minuten twee minuten van tevoren', () => {
    expect(waarschuwingsGrensMs(10)).toBe(2 * MINUUT)
  })

  it('gaat er bij lange levels niet overheen', () => {
    // Een kwartier gedeeld door vijf is drie minuten; dan sta je te vroeg te
    // wachten op iets wat nog lang niet komt.
    expect(waarschuwingsGrensMs(15)).toBe(2 * MINUUT)
    expect(waarschuwingsGrensMs(30)).toBe(2 * MINUUT)
  })
})

describe('passeertDeGrens', () => {
  it('waarschuwt op de tik waarop de grens gepasseerd wordt', () => {
    expect(passeertDeGrens(2 * MINUUT + 250, 2 * MINUUT, 2 * MINUUT)).toBe(true)
  })

  it('zwijgt zolang de klok boven de grens staat', () => {
    expect(passeertDeGrens(4 * MINUUT, 3 * MINUUT, 2 * MINUUT)).toBe(false)
  })

  it('waarschuwt niet nog een keer onder de grens', () => {
    // Anders piept de laatste minuut vier keer per seconde.
    expect(passeertDeGrens(45_000, 44_750, MINUUT)).toBe(false)
  })

  it('zwijgt bij een eerste meting binnen de grens', () => {
    // Zo begint een level dat je opent terwijl het al bijna om is: dan is er
    // niets gepasseerd en weet de tafel het allang.
    expect(passeertDeGrens(undefined, 30_000, MINUUT)).toBe(false)
  })

  it('waarschuwt ook als de klok in één sprong voorbij de grens gaat', () => {
    // Een slapende telefoon slaat tikken over; dan is de sprong groot en moet
    // de waarschuwing alsnog klinken.
    expect(passeertDeGrens(4 * MINUUT, 5_000, MINUUT)).toBe(true)
  })
})
