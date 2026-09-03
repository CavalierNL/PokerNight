import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { herhaalBlindToon } from './blindToon'

/** Een AudioContext die alleen bijhoudt hoe vaak er gespeeld is. */
function nepAudio() {
  let gespeeld = 0
  const knoop = {
    frequency: { value: 0 },
    type: '',
    gain: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => knoop,
    start: () => {},
    stop: () => {},
  }
  class Nep {
    state = 'running'
    currentTime = 0
    destination = {}
    constructor() {
      gespeeld += 1
    }
    createOscillator() {
      return knoop
    }
    createGain() {
      return knoop
    }
    close() {
      return Promise.resolve()
    }
  }
  return { Nep, aantal: () => gespeeld }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('herhaalBlindToon', () => {
  it('blijft herhalen zolang niemand reageert', () => {
    const { Nep, aantal } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    const stop = herhaalBlindToon()
    expect(aantal()).toBe(1)

    vi.advanceTimersByTime(6000)
    expect(aantal()).toBeGreaterThan(2)
    stop()
  })

  it('stopt zodra de aanroeper hem stopt', () => {
    // Het geluid hoort bij het scherm dat om bevestiging vraagt; dat scherm
    // bepaalt wanneer het zwijgt, niet een willekeurige tik op tafel.
    const { Nep, aantal } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    const stop = herhaalBlindToon()
    vi.advanceTimersByTime(4000)
    const naEenPaarKeer = aantal()

    stop()

    vi.advanceTimersByTime(20_000)
    expect(aantal()).toBe(naEenPaarKeer)
  })

  it('laat een tweede stop met rust', () => {
    const { Nep, aantal } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    const stop = herhaalBlindToon()
    stop()
    const na = aantal()
    stop()
    vi.advanceTimersByTime(20_000)
    expect(aantal()).toBe(na)
  })


  it('houdt vanzelf op als er niemand bij het scherm zit', () => {
    const { Nep, aantal } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    herhaalBlindToon()
    vi.advanceTimersByTime(60_000)
    const bijHetVangnet = aantal()

    vi.advanceTimersByTime(10 * 60_000)
    expect(aantal()).toBe(bijHetVangnet)
  })
})
