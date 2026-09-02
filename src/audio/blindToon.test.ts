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

let luisteraars: Record<string, Array<() => void>>

beforeEach(() => {
  vi.useFakeTimers()
  luisteraars = {}
  vi.stubGlobal('window', {
    addEventListener: (naam: string, fn: () => void) => {
      luisteraars[naam] = [...(luisteraars[naam] ?? []), fn]
    },
    removeEventListener: (naam: string, fn: () => void) => {
      luisteraars[naam] = (luisteraars[naam] ?? []).filter((f) => f !== fn)
    },
  })
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

  it('stopt zodra iemand het scherm aanraakt', () => {
    const { Nep, aantal } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    herhaalBlindToon()
    vi.advanceTimersByTime(4000)
    const naEenPaarKeer = aantal()

    for (const luisteraar of luisteraars['pointerdown'] ?? []) luisteraar()

    vi.advanceTimersByTime(20_000)
    expect(aantal()).toBe(naEenPaarKeer)
  })

  it('ruimt zijn luisteraars op, zodat er niets blijft hangen', () => {
    const { Nep } = nepAudio()
    vi.stubGlobal('AudioContext', Nep)

    const stop = herhaalBlindToon()
    expect(luisteraars['pointerdown']).toHaveLength(1)
    stop()
    expect(luisteraars['pointerdown']).toHaveLength(0)
    expect(luisteraars['keydown']).toHaveLength(0)
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
