# PokerNight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een statische webapp die een pokeravond bestuurt — blinds timer, blindstructuur, chipverdeling en prijzenpot — op één scherm midden op tafel.

**Architecture:** Alle rekenlogica zit in `src/domain/` als pure TypeScript zonder DOM, klok of React, volledig gedekt door Vitest. Daarboven ligt een dunne React-schil: een reducer-gebaseerde context die naar `localStorage` schrijft, en drie schermen. De klok wordt nooit opgeteld per tick maar afgeleid uit een opgeslagen eindtijdstip, zodat een refresh of slapende laptop hem niet verstoort.

**Tech Stack:** Vite, React 19, TypeScript, Vitest. Geen backend, geen router, geen state-library, geen CSS-framework.

**Spec:** `docs/superpowers/specs/2026-09-02-poker-night-design.md`

## Global Constraints

- **Taal:** alle UI-teksten, commentaar en commitberichten in het Nederlands. Code-identifiers in het Engels.
- **Node 26 / npm 11** zijn geïnstalleerd. Versieranges in `package.json` zijn ondergrenzen; als een range niet resolvet, gebruik de nieuwste stabiele major en noteer dat in de commit.
- **`src/domain/` is puur.** Geen import van React, geen `Date.now()`, geen `window`, geen `localStorage`. Tijd komt altijd binnen als parameter. Dit is de enige harde architectuurregel van het project.
- **Vite `base: '/poker-night/'`** — zonder dit laden de assets niet op GitHub Pages.
- **Geen rebuys of add-ons.** Het totaal aan fiches in spel is `spelers × startstack` en verandert nooit.
- **Individuele chipstacks bestaan niet.** Per speler wordt alleen `out: boolean` bijgehouden.
- **Bedragen zijn gehele getallen.** Blinds, stacks en fiches in fiche-eenheden; de prijzenpot in hele euro's.
- **Commit na elke taak**, met een Nederlandse beschrijving in de imperatief.

---

### Task 1: Projectopzet

Vite + React + TypeScript + Vitest, handmatig opgezet (niet via `npm create vite`, dat werkt niet in een map die al `.git` en `docs/` bevat).

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Interfaces:**
- Consumes: niets
- Produces: werkende `npm run dev`, `npm run build`, `npm test`

- [ ] **Step 1: Schrijf `package.json`**

```json
{
  "name": "poker-night",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Schrijf `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base moet het reponaam zijn: GitHub Pages serveert de site op /poker-night/
export default defineConfig({
  plugins: [react()],
  base: '/poker-night/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

Als TypeScript klaagt over de `test`-sleutel, voeg bovenaan `/// <reference types="vitest/config" />` toe.

- [ ] **Step 3: Schrijf `tsconfig.json` en `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "composite": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Schrijf `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`**

`index.html`:

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>PokerNight</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>PokerNight</h1>
}
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: Installeer en verifieer**

Run: `npm install && npm run build`
Expected: build slaagt, `dist/` wordt aangemaakt.

Run: `npm test`
Expected: Vitest meldt "No test files found" en eindigt met exit code 0 (of 1 met de melding dat er geen tests zijn — dat is hier acceptabel, de volgende taak voegt tests toe).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src
git commit -m "Zet Vite, React, TypeScript en Vitest op"
```

---

### Task 2: Chipsets en denominaties

**Files:**
- Create: `src/domain/chipset.ts`, `src/domain/chipset.test.ts`

**Interfaces:**
- Consumes: niets
- Produces:
  - `type Chip = { name: string; color: string; value: number; count: number }`
  - `type Chipset = { id: string; name: string; chips: Chip[] }`
  - `denominations(chipset: Chipset): number[]` — unieke waardes, oplopend
  - `chipsWithValue(chipset: Chipset, value: number): Chip[]`
  - `totalCountForValue(chipset: Chipset, value: number): number`
  - `HOUSE_RULES: Chipset`, `STANDARD_500: Chipset`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/chipset.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  denominations,
  chipsWithValue,
  totalCountForValue,
  HOUSE_RULES,
  STANDARD_500,
} from './chipset'

describe('denominations', () => {
  it('geeft unieke waardes oplopend terug', () => {
    expect(denominations(HOUSE_RULES)).toEqual([1, 5])
  })

  it('telt kleuren met dezelfde waarde als één denominatie', () => {
    const kleurenMetWaardeEen = HOUSE_RULES.chips.filter((c) => c.value === 1)
    expect(kleurenMetWaardeEen.length).toBeGreaterThan(1)
    expect(denominations(HOUSE_RULES)).toHaveLength(2)
  })

  it('herkent de vijf denominaties van de standaardset', () => {
    expect(denominations(STANDARD_500)).toEqual([1, 5, 25, 100, 500])
  })
})

describe('chipsWithValue', () => {
  it('geeft alle kleuren met die waarde', () => {
    expect(chipsWithValue(HOUSE_RULES, 5)).toHaveLength(1)
    expect(chipsWithValue(HOUSE_RULES, 1).length).toBeGreaterThan(1)
  })

  it('geeft een lege lijst voor een waarde die niet bestaat', () => {
    expect(chipsWithValue(HOUSE_RULES, 25)).toEqual([])
  })
})

describe('totalCountForValue', () => {
  it('telt de aantallen van alle kleuren met die waarde op', () => {
    const verwacht = HOUSE_RULES.chips
      .filter((c) => c.value === 1)
      .reduce((som, c) => som + c.count, 0)
    expect(totalCountForValue(HOUSE_RULES, 1)).toBe(verwacht)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- chipset`
Expected: FAIL — module `./chipset` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/chipset.ts`**

```ts
export type Chip = {
  /** Naam van de kleur zoals aan tafel gebruikt, bijv. "wit". */
  name: string
  /** Hex-kleur voor weergave. */
  color: string
  /** Waarde in fiche-eenheden. Meerdere kleuren mogen dezelfde waarde hebben. */
  value: number
  /** Totaal aantal fiches van deze kleur in de doos. */
  count: number
}

export type Chipset = {
  id: string
  name: string
  chips: Chip[]
}

/** Unieke waardes, oplopend. Kleuren met dezelfde waarde vormen één denominatie. */
export function denominations(chipset: Chipset): number[] {
  const waardes = new Set(chipset.chips.map((c) => c.value))
  return [...waardes].sort((a, b) => a - b)
}

export function chipsWithValue(chipset: Chipset, value: number): Chip[] {
  return chipset.chips.filter((c) => c.value === value)
}

export function totalCountForValue(chipset: Chipset, value: number): number {
  return chipsWithValue(chipset, value).reduce((som, c) => som + c.count, 0)
}

/** Huisregel: één kleur is 5 waard, alle andere kleuren zijn 1 waard. */
export const HOUSE_RULES: Chipset = {
  id: 'huisregel',
  name: 'Huisregel (5 en 1)',
  chips: [
    { name: 'wit', color: '#f2efe6', value: 1, count: 150 },
    { name: 'rood', color: '#c0392b', value: 1, count: 100 },
    { name: 'blauw', color: '#2e6da4', value: 1, count: 100 },
    { name: 'groen', color: '#2e8b57', value: 5, count: 150 },
  ],
}

/** Klassieke 500-set met oplopende denominaties. */
export const STANDARD_500: Chipset = {
  id: 'standaard-500',
  name: 'Standaardset (500 fiches)',
  chips: [
    { name: 'wit', color: '#f2efe6', value: 1, count: 150 },
    { name: 'rood', color: '#c0392b', value: 5, count: 150 },
    { name: 'groen', color: '#2e8b57', value: 25, count: 100 },
    { name: 'zwart', color: '#22262b', value: 100, count: 75 },
    { name: 'paars', color: '#6b4fa0', value: 500, count: 25 },
  ],
}

export const PRESETS: Chipset[] = [HOUSE_RULES, STANDARD_500]
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- chipset`
Expected: PASS, alle tests groen.

- [ ] **Step 5: Commit**

```bash
git add src/domain/chipset.ts src/domain/chipset.test.ts
git commit -m "Voeg chipset-model met denominaties en twee presets toe"
```

---

### Task 3: Betaalbare bedragen

Blinds mogen alleen bedragen zijn die met de aanwezige fiches te leggen zijn: de kleinste actieve denominatie `d` maal de 1-2-5-ladder.

**Files:**
- Create: `src/domain/amounts.ts`, `src/domain/amounts.test.ts`

**Interfaces:**
- Consumes: niets
- Produces:
  - `niceStep(amount: number, d: number): number`
  - `roundToPayable(amount: number, d: number, mustExceed?: number): number`
  - `smallBlindFor(bigBlind: number, d: number): number`

**Let op — afwijking van de spec.** De spec schrijft een vaste 1-2-5-ladder voor
(`d × {1, 2, 5, 10, …}`). Die werkt alleen zolang `d` groot is ten opzichte van de
blinds. Bij fiches van 1 en blinds rond de 100 zijn de enige toegestane bedragen
100, 200 en 500, waardoor een berekende structuur binnen drie levels ontspoort.
In plaats daarvan wordt afgerond op een stap die met het bedrag meeschaalt: een
tiende van de eigen grootteorde, met de fichewaarde als ondergrens. Dat levert
100, 120, 150, 200, 250 op waar de ladder 100, 200, 500 zou geven, en het blijft
betaalbaar met de aanwezige fiches. De spec is hierop bijgewerkt.

- [ ] **Step 1: Schrijf de falende test**

`src/domain/amounts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { niceStep, roundToPayable, smallBlindFor } from './amounts'

describe('niceStep', () => {
  it('is een tiende van de grootteorde van het bedrag', () => {
    expect(niceStep(124, 1)).toBe(10)
    expect(niceStep(2677, 1)).toBe(100)
  })

  it('gaat nooit onder de fichewaarde', () => {
    expect(niceStep(64, 5)).toBe(5)
    expect(niceStep(4, 1)).toBe(1)
  })

  it('gebruikt de fichewaarde als die groter is dan de grootteorde-stap', () => {
    expect(niceStep(150, 25)).toBe(25)
  })
})

describe('roundToPayable', () => {
  it('rondt af op een stap die met het bedrag meeschaalt', () => {
    expect(roundToPayable(124.5, 1)).toBe(120)
    expect(roundToPayable(2677, 1)).toBe(2700)
  })

  it('laat kleine bedragen met rust', () => {
    expect(roundToPayable(4, 1)).toBe(4)
    expect(roundToPayable(8, 1)).toBe(8)
  })

  it('rondt af op een veelvoud van de fichewaarde', () => {
    expect(roundToPayable(64, 5) % 5).toBe(0)
    expect(roundToPayable(64, 5)).toBe(65)
  })

  it('rondt nooit onder de fichewaarde', () => {
    expect(roundToPayable(0.4, 5)).toBe(5)
  })

  it('gaat een stap omhoog als de afronding niet boven mustExceed uitkomt', () => {
    expect(roundToPayable(100, 1, 100)).toBe(110)
  })

  it('blijft doorstappen tot het bedrag boven mustExceed ligt', () => {
    expect(roundToPayable(20, 1, 100)).toBeGreaterThan(100)
  })
})

describe('smallBlindFor', () => {
  it('is de helft van de big blind', () => {
    expect(smallBlindFor(10, 1)).toBe(5)
    expect(smallBlindFor(8, 1)).toBe(4)
  })

  it('rondt naar beneden af op een veelvoud van de fichewaarde', () => {
    // helft van 5 is 2,5 — het grootste veelvoud van 1 daaronder is 2
    expect(smallBlindFor(5, 1)).toBe(2)
    expect(smallBlindFor(150, 25)).toBe(75)
  })

  it('is minimaal één fichewaarde', () => {
    expect(smallBlindFor(1, 1)).toBe(1)
    expect(smallBlindFor(25, 25)).toBe(25)
  })

  it('blijft onder de big blind zodra die minstens twee fichewaardes is', () => {
    for (const [bb, d] of [
      [2, 1],
      [50, 25],
      [600, 100],
    ] as const) {
      expect(smallBlindFor(bb, d)).toBeLessThan(bb)
    }
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- amounts`
Expected: FAIL — module `./amounts` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/amounts.ts`**

```ts
/**
 * De stap waarop een bedrag afgerond wordt: een tiende van zijn eigen
 * grootteorde, maar nooit kleiner dan de kleinste fiche dat je op tafel kunt
 * leggen. Zo wordt 124 afgerond op 120 en 2677 op 2700 — bedragen die aan tafel
 * natuurlijk lezen en met weinig fiches te betalen zijn.
 */
export function niceStep(amount: number, d: number): number {
  if (amount <= 0) return d
  const grootteorde = Math.pow(10, Math.floor(Math.log10(amount)) - 1)
  return Math.max(d, grootteorde)
}

/**
 * Rondt `amount` af op een betaalbaar bedrag: een veelvoud van de fichewaarde,
 * op een stap die met het bedrag meeschaalt. Met `mustExceed` is de uitkomst
 * gegarandeerd strikt groter dan die waarde, zodat een blindstructuur nooit
 * stilstaat of terugloopt.
 */
export function roundToPayable(amount: number, d: number, mustExceed = 0): number {
  const stap = niceStep(Math.max(amount, mustExceed), d)
  let waarde = Math.max(d, Math.round(amount / stap) * stap)
  while (waarde <= mustExceed) waarde += stap
  return waarde
}

/**
 * De kleine blind: het grootste veelvoud van de fichewaarde dat niet boven de
 * helft van de big blind uitkomt, met een minimum van één fiche.
 */
export function smallBlindFor(bigBlind: number, d: number): number {
  return Math.max(d, Math.floor(bigBlind / 2 / d) * d)
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- amounts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/amounts.ts src/domain/amounts.test.ts
git commit -m "Voeg afronding op betaalbare blindbedragen toe"
```

---

### Task 4: Blindstructuur en color-up

De structuur wordt level voor level opgebouwd, omdat afronding afhangt van de kleinste actieve denominatie en die verandert bij een color-up. Sequentieel rekenen lost die afhankelijkheid op.

**Files:**
- Create: `src/domain/blinds.ts`, `src/domain/blinds.test.ts`
- Modify: geen

**Interfaces:**
- Consumes: `Chipset`, `denominations`, `chipsWithValue` uit `./chipset`; `roundToPayable`, `smallBlindFor` uit `./amounts`
- Produces:
  - `type StructureKind = 'calculated' | 'doubling' | 'manual'`
  - `type BlindLevel = { index: number; smallBlind: number; bigBlind: number }`
  - `type ColorUp = { levelIndex: number; retiredValue: number; retiredColors: string[]; nextValue: number }`
  - `type StructureInput = { kind: StructureKind; players: number; startingStack: number; durationMinutes: number; levelMinutes: number; manualBigBlinds?: number[] }`
  - `type Structure = { levels: BlindLevel[]; colorUps: ColorUp[] }`
  - `buildStructure(input: StructureInput, chipset: Chipset): Structure`
  - `levelCount(durationMinutes: number, levelMinutes: number): number`
  - `targetEndBigBlind(players: number, startingStack: number): number`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/blinds.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildStructure, levelCount, targetEndBigBlind } from './blinds'
import { HOUSE_RULES, STANDARD_500 } from './chipset'
import type { StructureInput } from './blinds'

const huisregel: StructureInput = {
  kind: 'doubling',
  players: 6,
  startingStack: 100,
  durationMinutes: 180,
  levelMinutes: 15,
}

describe('levelCount', () => {
  it('deelt de duur door de levellengte', () => {
    expect(levelCount(180, 15)).toBe(12)
  })

  it('rondt naar beneden af', () => {
    expect(levelCount(100, 15)).toBe(6)
  })

  it('geeft minstens twee levels', () => {
    expect(levelCount(10, 15)).toBe(2)
  })
})

describe('targetEndBigBlind', () => {
  it('mikt op tien big blinds gemiddeld bij drie spelers over', () => {
    // 8 spelers x 10000 = 80000 fiches, gedeeld door 3 spelers = 26666, / 10
    expect(targetEndBigBlind(8, 10000)).toBeCloseTo(2666.67, 1)
  })
})

describe('buildStructure — verdubbelend', () => {
  const structuur = buildStructure(huisregel, HOUSE_RULES)

  it('verdubbelt de big blind per level', () => {
    const bbs = structuur.levels.slice(0, 4).map((l) => l.bigBlind)
    expect(bbs).toEqual([2, 4, 8, 16])
  })

  it('begint op honderd big blinds diep, afgerond op een betaalbaar bedrag', () => {
    // startstack 100 / 100 = 1, maar de kleine blind moet minstens 1 zijn,
    // dus de big blind wordt 2
    expect(structuur.levels[0].bigBlind).toBe(2)
    expect(structuur.levels[0].smallBlind).toBe(1)
  })

  it('nummert de levels vanaf 0', () => {
    expect(structuur.levels[0].index).toBe(0)
    expect(structuur.levels[1].index).toBe(1)
  })
})

describe('buildStructure — berekend', () => {
  const structuur = buildStructure(
    { ...huisregel, kind: 'calculated', players: 8, startingStack: 10000, levelMinutes: 15, durationMinutes: 240 },
    STANDARD_500,
  )

  it('loopt strikt op', () => {
    for (let i = 1; i < structuur.levels.length; i++) {
      expect(structuur.levels[i].bigBlind).toBeGreaterThan(structuur.levels[i - 1].bigBlind)
    }
  })

  it('groeit langzamer dan verdubbelen', () => {
    const eerste = structuur.levels[0].bigBlind
    const tweede = structuur.levels[1].bigBlind
    expect(tweede).toBeLessThan(eerste * 2.5)
  })

  it('houdt de kleine blind altijd onder de big blind', () => {
    for (const level of structuur.levels) {
      expect(level.smallBlind).toBeLessThan(level.bigBlind)
    }
  })
})

describe('buildStructure — handmatig', () => {
  it('gebruikt de opgegeven big blinds', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [2, 6, 20] },
      HOUSE_RULES,
    )
    expect(structuur.levels.map((l) => l.bigBlind)).toEqual([2, 6, 20])
  })
})

describe('color-up', () => {
  it('haalt de kleinste denominatie eruit zodra de kleine blind tien keer zo groot is', () => {
    const structuur = buildStructure(huisregel, HOUSE_RULES)
    const eerste = structuur.colorUps[0]
    expect(eerste).toBeDefined()
    expect(eerste.retiredValue).toBe(1)
    expect(eerste.nextValue).toBe(5)
    const level = structuur.levels[eerste.levelIndex]
    expect(level.smallBlind).toBeGreaterThanOrEqual(10)
  })

  it('noemt de kleuren die uit het spel gaan', () => {
    const structuur = buildStructure(huisregel, HOUSE_RULES)
    expect(structuur.colorUps[0].retiredColors).toEqual(
      expect.arrayContaining(['wit', 'rood', 'blauw']),
    )
  })

  it('doet geen color-up als de hoogste denominatie bereikt is', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [2, 4] },
      HOUSE_RULES,
    )
    expect(structuur.colorUps).toEqual([])
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- blinds`
Expected: FAIL — module `./blinds` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/blinds.ts`**

```ts
import { chipsWithValue, denominations, type Chipset } from './chipset'
import { roundToPayable, smallBlindFor } from './amounts'

export type StructureKind = 'calculated' | 'doubling' | 'manual'

export type BlindLevel = {
  index: number
  smallBlind: number
  bigBlind: number
}

export type ColorUp = {
  /** Het level waarop deze kleur uit het spel mag. */
  levelIndex: number
  retiredValue: number
  retiredColors: string[]
  nextValue: number
}

export type StructureInput = {
  kind: StructureKind
  players: number
  startingStack: number
  durationMinutes: number
  levelMinutes: number
  manualBigBlinds?: number[]
}

export type Structure = {
  levels: BlindLevel[]
  colorUps: ColorUp[]
}

/** Aantal levels dat in de geplande duur past, minimaal twee. */
export function levelCount(durationMinutes: number, levelMinutes: number): number {
  return Math.max(2, Math.floor(durationMinutes / levelMinutes))
}

/**
 * De big blind waar de structuur naartoe werkt: bij nog drie spelers over is de
 * gemiddelde stack dan ongeveer tien big blinds.
 */
export function targetEndBigBlind(players: number, startingStack: number): number {
  return (players * startingStack) / 3 / 10
}

/**
 * De onafgeronde big blinds. De startwaarde is honderd big blinds diep, maar
 * minstens twee fiches — anders bestaat er geen kleine blind die daar strikt
 * onder ligt, en zou de hele reeks vanaf level 0 scheef staan.
 */
function rawBigBlinds(input: StructureInput, smallestDenomination: number): number[] {
  if (input.kind === 'manual') return input.manualBigBlinds ?? []

  const aantal = levelCount(input.durationMinutes, input.levelMinutes)
  const start = Math.max(input.startingStack / 100, smallestDenomination * 2)

  if (input.kind === 'doubling') {
    return Array.from({ length: aantal }, (_, i) => start * 2 ** i)
  }

  const eind = targetEndBigBlind(input.players, input.startingStack)
  const factor = Math.pow(Math.max(eind, start * 2) / start, 1 / (aantal - 1))
  return Array.from({ length: aantal }, (_, i) => start * factor ** i)
}

/**
 * Bouwt de structuur level voor level op. Dat moet sequentieel: afronden hangt
 * af van de kleinste actieve denominatie, en die verschuift zodra een color-up
 * plaatsvindt — wat op zijn beurt van de al berekende blinds afhangt.
 */
export function buildStructure(input: StructureInput, chipset: Chipset): Structure {
  const denoms = denominations(chipset)
  const ruw = rawBigBlinds(input, denoms[0] ?? 1)

  const levels: BlindLevel[] = []
  const colorUps: ColorUp[] = []
  let denomIndex = 0
  let vorigeBigBlind = 0

  ruw.forEach((ruweBb, index) => {
    const d = denoms[denomIndex]
    // De big blind moet minstens twee denominaties zijn, anders bestaat er geen
    // kleine blind die daar strikt onder ligt.
    const ondergrens = Math.max(vorigeBigBlind, d)
    const bigBlind = roundToPayable(Math.max(ruweBb, d * 2), d, ondergrens)
    const smallBlind = smallBlindFor(bigBlind, d)
    levels.push({ index, smallBlind, bigBlind })
    vorigeBigBlind = bigBlind

    // Is de kleinste kleur nog nuttig? Zodra de kleine blind tien keer die
    // waarde is, kun je hem uit het spel halen.
    const isLaatsteDenominatie = denomIndex >= denoms.length - 1
    if (!isLaatsteDenominatie && smallBlind >= 10 * d) {
      const volgende = denoms[denomIndex + 1]
      colorUps.push({
        levelIndex: index,
        retiredValue: d,
        retiredColors: chipsWithValue(chipset, d).map((c) => c.name),
        nextValue: volgende,
      })
      denomIndex += 1
    }
  })

  return { levels, colorUps }
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- blinds`
Expected: PASS. Als een test over exacte bedragen faalt, controleer eerst of de verwachting klopt met de spec (afronden op de 1-2-5-ladder, elk level strikt hoger) voordat je de implementatie aanpast.

- [ ] **Step 5: Commit**

```bash
git add src/domain/blinds.ts src/domain/blinds.test.ts
git commit -m "Bouw blindstructuur met color-up-momenten"
```

---

### Task 5: Prijzenpotverdeling

**Files:**
- Create: `src/domain/payout.ts`, `src/domain/payout.test.ts`

**Interfaces:**
- Consumes: niets
- Produces:
  - `type Payout = { place: number; amount: number }`
  - `payoutPercentages(players: number): number[]`
  - `calculatePayouts(buyIn: number, players: number): Payout[]`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/payout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculatePayouts, payoutPercentages } from './payout'

describe('payoutPercentages', () => {
  it('geeft alles aan de winnaar bij vier spelers of minder', () => {
    expect(payoutPercentages(4)).toEqual([100])
    expect(payoutPercentages(2)).toEqual([100])
  })

  it('betaalt twee plaatsen bij vijf tot zeven spelers', () => {
    expect(payoutPercentages(6)).toEqual([65, 35])
  })

  it('betaalt drie plaatsen bij acht tot elf spelers', () => {
    expect(payoutPercentages(8)).toEqual([50, 30, 20])
  })

  it('betaalt vier plaatsen vanaf twaalf spelers', () => {
    expect(payoutPercentages(12)).toEqual([40, 25, 20, 15])
  })
})

describe('calculatePayouts', () => {
  it('verdeelt de pot over de betaalde plaatsen', () => {
    const uitbetalingen = calculatePayouts(10, 8)
    expect(uitbetalingen).toHaveLength(3)
    expect(uitbetalingen[0].place).toBe(1)
  })

  it('telt altijd exact op tot de pot', () => {
    for (let spelers = 2; spelers <= 15; spelers++) {
      for (const inleg of [5, 10, 12.5, 20]) {
        const pot = Math.round(inleg * spelers)
        const som = calculatePayouts(inleg, spelers).reduce((s, u) => s + u.amount, 0)
        expect(som).toBe(pot)
      }
    }
  })

  it('geeft het afrondingsrestant aan de winnaar', () => {
    // pot 65, 65/35 => 42,25 en 22,75 => 42 en 22, restant 1 naar de winnaar
    const uitbetalingen = calculatePayouts(13, 5)
    expect(uitbetalingen[0].amount).toBe(43)
    expect(uitbetalingen[1].amount).toBe(22)
  })

  it('geeft hele euro-bedragen', () => {
    for (const uitbetaling of calculatePayouts(12.5, 9)) {
      expect(Number.isInteger(uitbetaling.amount)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- payout`
Expected: FAIL — module `./payout` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/payout.ts`**

```ts
export type Payout = {
  /** 1 is de winnaar. */
  place: number
  /** Bedrag in hele euro's. */
  amount: number
}

/** Verdeling in procenten, naar groepsgrootte. */
export function payoutPercentages(players: number): number[] {
  if (players <= 4) return [100]
  if (players <= 7) return [65, 35]
  if (players <= 11) return [50, 30, 20]
  return [40, 25, 20, 15]
}

/**
 * Verdeelt de pot over de betaalde plaatsen. Elk bedrag wordt naar beneden
 * afgerond op hele euro's; het restant gaat naar de winnaar, zodat de som altijd
 * exact de pot is en er geen munten over blijven.
 */
export function calculatePayouts(buyIn: number, players: number): Payout[] {
  const pot = Math.round(buyIn * players)
  const percentages = payoutPercentages(players)

  const bedragen = percentages.map((p) => Math.floor((pot * p) / 100))
  const restant = pot - bedragen.reduce((som, b) => som + b, 0)
  bedragen[0] += restant

  return bedragen.map((amount, i) => ({ place: i + 1, amount }))
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- payout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/payout.ts src/domain/payout.test.ts
git commit -m "Voeg prijzenpotverdeling toe die exact optelt tot de pot"
```

---

### Task 6: Chipverdeling

**Files:**
- Create: `src/domain/distribution.ts`, `src/domain/distribution.test.ts`

**Interfaces:**
- Consumes: `Chipset`, `Chip`, `denominations`, `chipsWithValue`, `totalCountForValue` uit `./chipset`
- Produces:
  - `type Allocation = { name: string; color: string; value: number; count: number }`
  - `type Distribution = { perPlayer: Allocation[]; stackValue: number; shortages: string[]; maxPlayers: number }`
  - `distributeChips(chipset: Chipset, players: number, targetStack: number, startSmallBlind: number): Distribution`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/distribution.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { distributeChips } from './distribution'
import { HOUSE_RULES, STANDARD_500 } from './chipset'

describe('distributeChips — huisregel', () => {
  const verdeling = distributeChips(HOUSE_RULES, 6, 100, 1)

  it('komt uit op ongeveer de gewenste startstack', () => {
    expect(verdeling.stackValue).toBeLessThanOrEqual(100)
    expect(verdeling.stackValue).toBeGreaterThan(80)
  })

  it('geeft elke speler genoeg kleine fiches voor de eerste levels', () => {
    const kleine = verdeling.perPlayer
      .filter((a) => a.value === 1)
      .reduce((som, a) => som + a.count, 0)
    expect(kleine).toBeGreaterThanOrEqual(20)
  })

  it('deelt nooit meer fiches uit dan er in de doos zitten', () => {
    for (const allocatie of verdeling.perPlayer) {
      const chip = HOUSE_RULES.chips.find((c) => c.name === allocatie.name)!
      expect(allocatie.count * 6).toBeLessThanOrEqual(chip.count)
    }
  })

  it('meldt geen tekorten bij zes spelers', () => {
    expect(verdeling.shortages).toEqual([])
  })
})

describe('distributeChips — tekorten', () => {
  it('meldt een tekort en het maximale aantal spelers', () => {
    const kleineDoos = {
      id: 'klein',
      name: 'Kleine doos',
      chips: [
        { name: 'wit', color: '#fff', value: 1, count: 40 },
        { name: 'groen', color: '#0a0', value: 5, count: 20 },
      ],
    }
    const verdeling = distributeChips(kleineDoos, 10, 100, 1)
    expect(verdeling.shortages.length).toBeGreaterThan(0)
    expect(verdeling.maxPlayers).toBeLessThan(10)
  })
})

describe('distributeChips — standaardset', () => {
  const verdeling = distributeChips(STANDARD_500, 8, 10000, 50)

  it('gebruikt ook de hoge denominaties', () => {
    const hoog = verdeling.perPlayer.filter((a) => a.value >= 100 && a.count > 0)
    expect(hoog.length).toBeGreaterThan(0)
  })

  it('blijft binnen de gewenste startstack', () => {
    expect(verdeling.stackValue).toBeLessThanOrEqual(10000)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- distribution`
Expected: FAIL — module `./distribution` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/distribution.ts`**

```ts
import { chipsWithValue, denominations, totalCountForValue, type Chipset } from './chipset'

export type Allocation = {
  name: string
  color: string
  value: number
  /** Aantal fiches van deze kleur per speler. */
  count: number
}

export type Distribution = {
  perPlayer: Allocation[]
  /** Waarde van de startstack die deze verdeling oplevert. */
  stackValue: number
  /** Leesbare meldingen over kleuren waarvan er te weinig zijn. */
  shortages: string[]
  /** Hoeveel spelers er met deze doos wél bediend kunnen worden. */
  maxPlayers: number
}

/** Zoveel keer de start-kleine-blind wil je aan kleine fiches hebben. */
const KLEINE_FICHES_IN_BLINDS = 20

/** Verdeelt een aantal fiches van één denominatie over de beschikbare kleuren. */
function spreadOverColors(chipset: Chipset, value: number, perPlayer: number, players: number): Allocation[] {
  const kleuren = chipsWithValue(chipset, value).sort((a, b) => b.count - a.count)
  const allocaties: Allocation[] = []
  let teVerdelen = perPlayer

  for (const chip of kleuren) {
    if (teVerdelen <= 0) break
    const beschikbaarPerSpeler = Math.floor(chip.count / players)
    const aantal = Math.min(teVerdelen, beschikbaarPerSpeler)
    if (aantal > 0) {
      allocaties.push({ name: chip.name, color: chip.color, value, count: aantal })
      teVerdelen -= aantal
    }
  }
  return allocaties
}

/**
 * Eén poging tot verdeling voor een gegeven aantal spelers. Eerst genoeg kleine
 * fiches om de eerste levels te kunnen betalen, daarna de rest van de stack
 * opvullen met de grootste denominaties die passen — dat houdt de tafel
 * overzichtelijk.
 */
function attempt(
  chipset: Chipset,
  players: number,
  targetStack: number,
  startSmallBlind: number,
): Omit<Distribution, 'maxPlayers'> {
  const denoms = denominations(chipset)
  const shortages: string[] = []
  const allocaties: Allocation[] = []

  // 1. Reserveer kleine fiches voor de eerste levels.
  const kleinste = denoms[0]
  const gewenstKlein = Math.ceil((KLEINE_FICHES_IN_BLINDS * startSmallBlind) / kleinste)
  const beschikbaarKlein = Math.floor(totalCountForValue(chipset, kleinste) / players)
  const aantalKlein = Math.min(gewenstKlein, beschikbaarKlein)
  if (aantalKlein < gewenstKlein) {
    shortages.push(
      `Te weinig fiches van ${kleinste}: ${aantalKlein} per speler in plaats van ${gewenstKlein}.`,
    )
  }
  allocaties.push(...spreadOverColors(chipset, kleinste, aantalKlein, players))

  // 2. Vul de rest van de stack met de grootste denominaties die passen.
  let rest = targetStack - aantalKlein * kleinste
  for (const waarde of [...denoms].reverse()) {
    if (waarde === kleinste || rest < waarde) continue
    const beschikbaar = Math.floor(totalCountForValue(chipset, waarde) / players)
    const aantal = Math.min(Math.floor(rest / waarde), beschikbaar)
    if (aantal > 0) {
      allocaties.push(...spreadOverColors(chipset, waarde, aantal, players))
      rest -= aantal * waarde
    }
  }

  // 3. Vul het laatste restje aan met kleine fiches, voor zover die er nog zijn.
  const extra = Math.min(Math.floor(rest / kleinste), beschikbaarKlein - aantalKlein)
  if (extra > 0) {
    const overige = allocaties.filter((a) => a.value !== kleinste)
    allocaties.length = 0
    allocaties.push(
      ...spreadOverColors(chipset, kleinste, aantalKlein + extra, players),
      ...overige,
    )
  }

  const stackValue = allocaties.reduce((som, a) => som + a.value * a.count, 0)
  if (stackValue < targetStack * 0.9) {
    shortages.push(
      `De doos haalt de gewenste startstack niet: ${stackValue} in plaats van ${targetStack}.`,
    )
  }

  return { perPlayer: allocaties, stackValue, shortages }
}

/**
 * Bepaalt wat elke speler bij aanvang krijgt. Levert de verdeling op tekorten
 * na, plus — als het niet past — het grootste aantal spelers waarvoor de doos
 * wél toereikend is.
 */
export function distributeChips(
  chipset: Chipset,
  players: number,
  targetStack: number,
  startSmallBlind: number,
): Distribution {
  if (denominations(chipset).length === 0 || players <= 0) {
    return {
      perPlayer: [],
      stackValue: 0,
      shortages: ['Deze chipset heeft geen fiches.'],
      maxPlayers: 0,
    }
  }

  const poging = attempt(chipset, players, targetStack, startSmallBlind)
  if (poging.shortages.length === 0) return { ...poging, maxPlayers: players }

  // Bij een tekort is de vraag: hoeveel spelers past deze doos dan wél? Het
  // aantal telt terug tot de verdeling zonder klachten rondkomt.
  let maxPlayers = 0
  for (let n = players - 1; n >= 1; n--) {
    if (attempt(chipset, n, targetStack, startSmallBlind).shortages.length === 0) {
      maxPlayers = n
      break
    }
  }
  return { ...poging, maxPlayers }
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- distribution`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/distribution.ts src/domain/distribution.test.ts
git commit -m "Voeg chipverdeling met tekortmeldingen toe"
```

---

### Task 7: Toernooi-reducer

De live state. Alle overgangen lopen via benoemde acties, zodat "de timer liep af" en "iemand ging eruit" hetzelfde pad naar een levelverhoging delen. Tijd komt altijd als parameter binnen — nooit `Date.now()` in dit bestand.

**Files:**
- Create: `src/domain/tournament.ts`, `src/domain/tournament.test.ts`

**Interfaces:**
- Consumes: `Structure`, `BlindLevel`, `StructureKind`, `buildStructure` uit `./blinds`; `Chipset` uit `./chipset`
- Produces:
  - `type Trigger = 'time' | 'elimination' | 'both'`
  - `type Settings = { playerNames: string[]; buyIn: number; startingStack: number; levelMinutes: number; durationMinutes: number; structure: StructureKind; trigger: Trigger; manualBigBlinds?: number[]; chipsetId: string }`
  - `type Clock = { state: 'running'; endsAt: number } | { state: 'paused'; remainingMs: number }`
  - `type Player = { name: string; out: boolean }`
  - `type Tournament = { settings: Settings; levels: BlindLevel[]; colorUps: ColorUp[]; levelIndex: number; players: Player[]; clock: Clock; startedAt: number; pausedMs: number; history: Snapshot[] }`
  - `createTournament(settings: Settings, chipset: Chipset, now: number): Tournament`
  - `reduce(state: Tournament, action: Action): Tournament`
  - `currentLevel(state)`, `nextLevel(state)`, `remainingMs(state, now)`, `playersLeft(state)`, `totalChips(state)`, `averageStack(state)`, `averageStackInBigBlinds(state)`, `colorUpAt(state, levelIndex)`
  - `type Action = { type: 'tick'; now: number } | { type: 'playerOut'; index: number; now: number } | { type: 'advanceLevel'; now: number } | { type: 'togglePause'; now: number } | { type: 'undo' }`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/tournament.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  averageStack,
  averageStackInBigBlinds,
  createTournament,
  currentLevel,
  playersLeft,
  reduce,
  remainingMs,
  type Settings,
} from './tournament'
import { HOUSE_RULES } from './chipset'

const T0 = 1_000_000

const basis: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: HOUSE_RULES.id,
}

const maak = (overrides: Partial<Settings> = {}) =>
  createTournament({ ...basis, ...overrides }, HOUSE_RULES, T0)

describe('createTournament', () => {
  it('begint op level 0 met een lopende klok', () => {
    const t = maak()
    expect(t.levelIndex).toBe(0)
    expect(t.clock.state).toBe('running')
  })

  it('zet alle spelers in het toernooi', () => {
    expect(playersLeft(maak())).toBe(4)
  })

  it('laat de klok de levellengte lopen', () => {
    expect(remainingMs(maak(), T0)).toBe(15 * 60 * 1000)
  })
})

describe('tick', () => {
  it('verhoogt het level als de tijd om is en de trigger tijd omvat', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'tick', now: T0 + 15 * 60 * 1000 })
    expect(na.levelIndex).toBe(1)
  })

  it('verhoogt het level niet zolang er tijd over is', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet bij de trigger eliminatie', () => {
    const t = maak({ trigger: 'elimination' })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })

  it('doet niets als de klok gepauzeerd is', () => {
    const t = reduce(maak(), { type: 'togglePause', now: T0 })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })
})

describe('playerOut', () => {
  it('haalt de speler uit het toernooi', () => {
    const na = reduce(maak(), { type: 'playerOut', index: 1, now: T0 })
    expect(na.players[1].out).toBe(true)
    expect(playersLeft(na)).toBe(3)
  })

  it('verhoogt het level bij de trigger eliminatie', () => {
    const t = maak({ trigger: 'elimination' })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(1)
  })

  it('zet de leveltimer terug op vol bij een eliminatie', () => {
    const t = maak({ trigger: 'both' })
    const halverwege = T0 + 7 * 60 * 1000
    const na = reduce(t, { type: 'playerOut', index: 0, now: halverwege })
    expect(remainingMs(na, halverwege)).toBe(15 * 60 * 1000)
  })

  it('verhoogt het level niet bij de trigger tijd', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet tijdens een pauze', () => {
    const t = reduce(maak({ trigger: 'both' }), { type: 'togglePause', now: T0 })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
    expect(na.players[0].out).toBe(true)
  })
})

describe('togglePause', () => {
  it('bevriest de resterende tijd', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 5 * 60 * 1000 })
    expect(gepauzeerd.clock.state).toBe('paused')
    expect(remainingMs(gepauzeerd, T0 + 60 * 60 * 1000)).toBe(10 * 60 * 1000)
  })

  it('hervat waar de klok gebleven was', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 5 * 60 * 1000 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 60 * 60 * 1000 })
    expect(hervat.clock.state).toBe('running')
    expect(remainingMs(hervat, T0 + 60 * 60 * 1000)).toBe(10 * 60 * 1000)
  })

  it('telt de gepauzeerde tijd op', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 3 * 60 * 1000 })
    expect(hervat.pausedMs).toBe(3 * 60 * 1000)
  })
})

describe('undo', () => {
  it('draait een eliminatie terug', () => {
    const t = maak()
    const na = reduce(t, { type: 'playerOut', index: 2, now: T0 })
    const terug = reduce(na, { type: 'undo' })
    expect(terug.players[2].out).toBe(false)
    expect(terug.levelIndex).toBe(0)
  })

  it('doet niets als er niets terug te draaien is', () => {
    const t = maak()
    expect(reduce(t, { type: 'undo' }).players).toEqual(t.players)
  })
})

describe('gemiddelde stack', () => {
  it('is het totaal gedeeld door de spelers die nog meedoen', () => {
    const t = maak()
    expect(averageStack(t)).toBe(100)
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(averageStack(na)).toBeCloseTo(400 / 3)
  })

  it('rekent om naar big blinds', () => {
    const t = maak()
    const bb = currentLevel(t).bigBlind
    expect(averageStackInBigBlinds(t)).toBeCloseTo(100 / bb)
  })
})

describe('einde structuur', () => {
  it('blijft op het laatste level staan', () => {
    let t = maak({ trigger: 'time', durationMinutes: 30 })
    const laatste = t.levels.length - 1
    for (let i = 0; i < 10; i++) {
      t = reduce(t, { type: 'advanceLevel', now: T0 })
    }
    expect(t.levelIndex).toBe(laatste)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- tournament`
Expected: FAIL — module `./tournament` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/tournament.ts`**

```ts
import { buildStructure, type BlindLevel, type ColorUp, type StructureKind } from './blinds'
import type { Chipset } from './chipset'

export type Trigger = 'time' | 'elimination' | 'both'

export type Settings = {
  playerNames: string[]
  /** Inleg per speler in euro's. */
  buyIn: number
  startingStack: number
  levelMinutes: number
  durationMinutes: number
  structure: StructureKind
  trigger: Trigger
  manualBigBlinds?: number[]
  chipsetId: string
}

/**
 * De klok telt nooit op per tick. Lopend betekent: er is een eindtijdstip en de
 * resterende tijd volgt uit de huidige tijd. Gepauzeerd betekent: de resterende
 * tijd staat vast. Daardoor overleeft de klok een refresh of een slapende laptop.
 */
export type Clock =
  | { state: 'running'; endsAt: number }
  | { state: 'paused'; remainingMs: number }

export type Player = { name: string; out: boolean }

type Snapshot = Omit<Tournament, 'history'>

export type Tournament = {
  settings: Settings
  levels: BlindLevel[]
  colorUps: ColorUp[]
  levelIndex: number
  players: Player[]
  clock: Clock
  startedAt: number
  /** Totaal gepauzeerde tijd, voor de verwachte eindtijd. */
  pausedMs: number
  history: Snapshot[]
}

export type Action =
  | { type: 'tick'; now: number }
  | { type: 'playerOut'; index: number; now: number }
  | { type: 'advanceLevel'; now: number }
  | { type: 'togglePause'; now: number }
  | { type: 'undo' }

const HISTORY_LIMIT = 20

export function createTournament(settings: Settings, chipset: Chipset, now: number): Tournament {
  const { levels, colorUps } = buildStructure(
    {
      kind: settings.structure,
      players: settings.playerNames.length,
      startingStack: settings.startingStack,
      durationMinutes: settings.durationMinutes,
      levelMinutes: settings.levelMinutes,
      manualBigBlinds: settings.manualBigBlinds,
    },
    chipset,
  )

  return {
    settings,
    levels,
    colorUps,
    levelIndex: 0,
    players: settings.playerNames.map((name) => ({ name, out: false })),
    clock: { state: 'running', endsAt: now + settings.levelMinutes * 60_000 },
    startedAt: now,
    pausedMs: 0,
    history: [],
  }
}

export function currentLevel(state: Tournament): BlindLevel {
  return state.levels[state.levelIndex]
}

export function nextLevel(state: Tournament): BlindLevel | undefined {
  return state.levels[state.levelIndex + 1]
}

export function remainingMs(state: Tournament, now: number): number {
  if (state.clock.state === 'paused') return state.clock.remainingMs
  return Math.max(0, state.clock.endsAt - now)
}

export function playersLeft(state: Tournament): number {
  return state.players.filter((p) => !p.out).length
}

export function totalChips(state: Tournament): number {
  return state.players.length * state.settings.startingStack
}

export function averageStack(state: Tournament): number {
  const over = playersLeft(state)
  return over === 0 ? 0 : totalChips(state) / over
}

export function averageStackInBigBlinds(state: Tournament): number {
  const bb = currentLevel(state).bigBlind
  return bb === 0 ? 0 : averageStack(state) / bb
}

export function colorUpAt(state: Tournament, levelIndex: number): ColorUp | undefined {
  return state.colorUps.find((c) => c.levelIndex === levelIndex)
}

function snapshot(state: Tournament): Snapshot {
  const { history: _history, ...rest } = state
  return structuredClone(rest)
}

function withHistory(state: Tournament, next: Omit<Tournament, 'history'>): Tournament {
  return { ...next, history: [snapshot(state), ...state.history].slice(0, HISTORY_LIMIT) }
}

/** Zet het level één op en start de leveltimer opnieuw. Blijft op het laatste level staan. */
function goToNextLevel(state: Omit<Tournament, 'history'>, now: number): Omit<Tournament, 'history'> {
  const laatste = state.levels.length - 1
  if (state.levelIndex >= laatste) return state
  return {
    ...state,
    levelIndex: state.levelIndex + 1,
    clock: { state: 'running', endsAt: now + state.settings.levelMinutes * 60_000 },
  }
}

const advancesOnTime = (t: Trigger) => t === 'time' || t === 'both'
const advancesOnElimination = (t: Trigger) => t === 'elimination' || t === 'both'

export function reduce(state: Tournament, action: Action): Tournament {
  switch (action.type) {
    case 'tick': {
      if (state.clock.state === 'paused') return state
      if (!advancesOnTime(state.settings.trigger)) return state
      if (remainingMs(state, action.now) > 0) return state
      const { history: _h, ...zonder } = state
      return withHistory(state, goToNextLevel(zonder, action.now))
    }

    case 'playerOut': {
      const spelers = state.players.map((p, i) => (i === action.index ? { ...p, out: true } : p))
      const { history: _h, ...zonder } = state
      let volgende: Omit<Tournament, 'history'> = { ...zonder, players: spelers }
      // Tijdens een pauze wordt er niet gespeeld, dus verhoogt een eliminatie
      // de blinds niet.
      if (state.clock.state === 'running' && advancesOnElimination(state.settings.trigger)) {
        volgende = goToNextLevel(volgende, action.now)
      }
      return withHistory(state, volgende)
    }

    case 'advanceLevel': {
      const { history: _h, ...zonder } = state
      return withHistory(state, goToNextLevel(zonder, action.now))
    }

    case 'togglePause': {
      const { history: _h, ...zonder } = state
      if (state.clock.state === 'running') {
        return withHistory(state, {
          ...zonder,
          clock: { state: 'paused', remainingMs: remainingMs(state, action.now) },
        })
      }
      const pauzeDuur = action.now - (state.startedAt + 0) // vervangen hieronder
      void pauzeDuur
      return withHistory(state, {
        ...zonder,
        clock: { state: 'running', endsAt: action.now + state.clock.remainingMs },
      })
    }

    case 'undo': {
      const [vorige, ...rest] = state.history
      if (!vorige) return state
      return { ...vorige, history: rest }
    }
  }
}
```

- [ ] **Step 4: Corrigeer het bijhouden van `pausedMs`**

De code hierboven laat `pausedMs` nog op nul staan. De pauzeduur is alleen te
berekenen als je weet wanneer de pauze begon, dus voeg dat toe aan de gepauzeerde
klok en gebruik het bij hervatten:

```ts
export type Clock =
  | { state: 'running'; endsAt: number }
  | { state: 'paused'; remainingMs: number; pausedAt: number }
```

In `togglePause`, tak "lopend naar gepauzeerd":

```ts
clock: { state: 'paused', remainingMs: remainingMs(state, action.now), pausedAt: action.now },
```

In `togglePause`, tak "gepauzeerd naar lopend" — vervang de twee regels met
`pauzeDuur` door:

```ts
return withHistory(state, {
  ...zonder,
  pausedMs: state.pausedMs + (action.now - state.clock.pausedAt),
  clock: { state: 'running', endsAt: action.now + state.clock.remainingMs },
})
```

- [ ] **Step 5: Draai de test en zie hem slagen**

Run: `npm test -- tournament`
Expected: PASS.

Run: `npm test`
Expected: alle testbestanden groen.

- [ ] **Step 6: Commit**

```bash
git add src/domain/tournament.ts src/domain/tournament.test.ts
git commit -m "Voeg toernooi-reducer met klok, eliminaties en undo toe"
```

---

### Task 8: Waarschuwingen voor de setup

Fouten horen vóór de start zichtbaar te zijn, niet tijdens level 5.

**Files:**
- Create: `src/domain/warnings.ts`, `src/domain/warnings.test.ts`

**Interfaces:**
- Consumes: `Settings` uit `./tournament`, `Structure` uit `./blinds`, `Distribution` uit `./distribution`
- Produces:
  - `type Warning = { level: 'error' | 'warning'; message: string }`
  - `setupWarnings(settings: Settings, structure: Structure, distribution: Distribution): Warning[]`

- [ ] **Step 1: Schrijf de falende test**

`src/domain/warnings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { setupWarnings } from './warnings'
import type { Settings } from './tournament'
import type { Structure } from './blinds'
import type { Distribution } from './distribution'

const settings: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: 'huisregel',
}

const goedeStructuur: Structure = {
  levels: [
    { index: 0, smallBlind: 1, bigBlind: 2 },
    { index: 1, smallBlind: 2, bigBlind: 4 },
  ],
  colorUps: [],
}

const goedeVerdeling: Distribution = {
  perPlayer: [{ name: 'wit', color: '#fff', value: 1, count: 100 }],
  stackValue: 100,
  shortages: [],
  maxPlayers: 8,
}

describe('setupWarnings', () => {
  it('meldt niets als alles klopt', () => {
    expect(setupWarnings(settings, goedeStructuur, goedeVerdeling)).toEqual([])
  })

  it('meldt een fout bij minder dan twee spelers', () => {
    const warnings = setupWarnings({ ...settings, playerNames: ['Sam'] }, goedeStructuur, goedeVerdeling)
    expect(warnings.some((w) => w.level === 'error')).toBe(true)
  })

  it('geeft tekorten uit de chipverdeling door', () => {
    const verdeling = { ...goedeVerdeling, shortages: ['Te weinig witte fiches.'] }
    const warnings = setupWarnings(settings, goedeStructuur, verdeling)
    expect(warnings.some((w) => w.message.includes('Te weinig witte fiches.'))).toBe(true)
  })

  it('waarschuwt als de eind-big-blind boven de gemiddelde stack uitkomt', () => {
    const structuur: Structure = {
      levels: [
        { index: 0, smallBlind: 1, bigBlind: 2 },
        { index: 1, smallBlind: 250, bigBlind: 500 },
      ],
      colorUps: [],
    }
    const warnings = setupWarnings(settings, structuur, goedeVerdeling)
    expect(warnings.some((w) => w.level === 'warning')).toBe(true)
  })

  it('meldt een fout bij een structuur zonder levels', () => {
    const warnings = setupWarnings(settings, { levels: [], colorUps: [] }, goedeVerdeling)
    expect(warnings.some((w) => w.level === 'error')).toBe(true)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- warnings`
Expected: FAIL — module `./warnings` bestaat niet.

- [ ] **Step 3: Schrijf `src/domain/warnings.ts`**

```ts
import type { Structure } from './blinds'
import type { Distribution } from './distribution'
import type { Settings } from './tournament'

export type Warning = {
  /** `error` blokkeert de start, `warning` niet. */
  level: 'error' | 'warning'
  message: string
}

export function setupWarnings(
  settings: Settings,
  structure: Structure,
  distribution: Distribution,
): Warning[] {
  const warnings: Warning[] = []

  if (settings.playerNames.length < 2) {
    warnings.push({ level: 'error', message: 'Je hebt minstens twee spelers nodig.' })
  }

  if (structure.levels.length === 0) {
    warnings.push({ level: 'error', message: 'Deze instellingen leveren geen blindstructuur op.' })
  }

  for (const tekort of distribution.shortages) {
    warnings.push({ level: 'error', message: tekort })
  }

  if (distribution.maxPlayers > 0 && distribution.maxPlayers < settings.playerNames.length) {
    warnings.push({
      level: 'error',
      message: `Deze doos is genoeg voor ${distribution.maxPlayers} spelers, niet voor ${settings.playerNames.length}.`,
    })
  }

  const laatste = structure.levels[structure.levels.length - 1]
  if (laatste) {
    const gemiddeldeStackBijDrie = (settings.playerNames.length * settings.startingStack) / 3
    if (laatste.bigBlind > gemiddeldeStackBijDrie) {
      warnings.push({
        level: 'warning',
        message:
          'De blinds lopen hard op: aan het eind is de big blind groter dan een gemiddelde stack. ' +
          'Overweeg langere levels of een berekende structuur.',
      })
    }
  }

  return warnings
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- warnings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/warnings.ts src/domain/warnings.test.ts
git commit -m "Voeg setup-waarschuwingen toe die fouten voor de start tonen"
```

---

### Task 9: Opslag en app-state

De React-schil. Hier — en alleen hier — komen `Date.now()`, `localStorage` en React samen.

**Files:**
- Create: `src/state/storage.ts`, `src/state/storage.test.ts`, `src/state/AppState.tsx`

**Interfaces:**
- Consumes: `Tournament`, `Settings`, `reduce`, `createTournament` uit `../domain/tournament`; `Chipset`, `PRESETS` uit `../domain/chipset`
- Produces:
  - `loadTournament(): Tournament | null`, `saveTournament(t: Tournament | null): void`
  - `loadChipsets(): Chipset[]`, `saveChipsets(c: Chipset[]): void`
  - `loadSettings(): Settings | null`, `saveSettings(s: Settings): void`
  - `loadPreferences(): Preferences`, `savePreferences(p: Preferences): void` met `type Preferences = { sound: boolean; wakeLock: boolean }`
  - React: `<AppStateProvider>`, `useAppState()` met `{ tournament, settings, chipsets, preferences, start, dispatch, discard, setChipsets, setPreferences }`

- [ ] **Step 1: Schrijf de falende test voor de opslag**

`src/state/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { loadChipsets, loadPreferences, saveChipsets, savePreferences } from './storage'
import { PRESETS } from '../domain/chipset'

// Minimale localStorage-stub; Vitest draait standaard zonder DOM.
beforeEach(() => {
  const opslag = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => opslag.get(k) ?? null,
    setItem: (k: string, v: string) => void opslag.set(k, v),
    removeItem: (k: string) => void opslag.delete(k),
    clear: () => opslag.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

describe('chipsets', () => {
  it('geeft de presets terug als er niets is opgeslagen', () => {
    expect(loadChipsets()).toEqual(PRESETS)
  })

  it('bewaart en leest chipsets terug', () => {
    const eigen = [{ id: 'x', name: 'Mijn doos', chips: [{ name: 'wit', color: '#fff', value: 1, count: 10 }] }]
    saveChipsets(eigen)
    expect(loadChipsets()).toEqual(eigen)
  })

  it('valt terug op de presets bij kapotte opslag', () => {
    localStorage.setItem('pokernight.chipsets', '{niet-geldig')
    expect(loadChipsets()).toEqual(PRESETS)
  })
})

describe('voorkeuren', () => {
  it('heeft geluid en wake lock standaard aan', () => {
    expect(loadPreferences()).toEqual({ sound: true, wakeLock: true })
  })

  it('bewaart een wijziging', () => {
    savePreferences({ sound: false, wakeLock: true })
    expect(loadPreferences().sound).toBe(false)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm test -- storage`
Expected: FAIL — module `./storage` bestaat niet.

- [ ] **Step 3: Schrijf `src/state/storage.ts`**

```ts
import { PRESETS, type Chipset } from '../domain/chipset'
import type { Settings, Tournament } from '../domain/tournament'

const SLEUTELS = {
  tournament: 'pokernight.tournament',
  chipsets: 'pokernight.chipsets',
  settings: 'pokernight.settings',
  preferences: 'pokernight.preferences',
} as const

export type Preferences = { sound: boolean; wakeLock: boolean }

const STANDAARD_VOORKEUREN: Preferences = { sound: true, wakeLock: true }

/** Leest JSON uit localStorage en valt bij elke fout terug op de standaard. */
function lees<T>(sleutel: string, standaard: T): T {
  try {
    const ruw = localStorage.getItem(sleutel)
    if (ruw === null) return standaard
    return JSON.parse(ruw) as T
  } catch {
    return standaard
  }
}

function schrijf(sleutel: string, waarde: unknown): void {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde))
  } catch {
    // Opslag vol of geblokkeerd: de app werkt door, alleen zonder herstel.
  }
}

export function loadTournament(): Tournament | null {
  return lees<Tournament | null>(SLEUTELS.tournament, null)
}

export function saveTournament(tournament: Tournament | null): void {
  if (tournament === null) {
    try {
      localStorage.removeItem(SLEUTELS.tournament)
    } catch {
      /* niets te doen */
    }
    return
  }
  schrijf(SLEUTELS.tournament, tournament)
}

export function loadChipsets(): Chipset[] {
  const opgeslagen = lees<Chipset[]>(SLEUTELS.chipsets, PRESETS)
  return Array.isArray(opgeslagen) && opgeslagen.length > 0 ? opgeslagen : PRESETS
}

export function saveChipsets(chipsets: Chipset[]): void {
  schrijf(SLEUTELS.chipsets, chipsets)
}

export function loadSettings(): Settings | null {
  return lees<Settings | null>(SLEUTELS.settings, null)
}

export function saveSettings(settings: Settings): void {
  schrijf(SLEUTELS.settings, settings)
}

export function loadPreferences(): Preferences {
  return { ...STANDAARD_VOORKEUREN, ...lees<Partial<Preferences>>(SLEUTELS.preferences, {}) }
}

export function savePreferences(preferences: Preferences): void {
  schrijf(SLEUTELS.preferences, preferences)
}
```

- [ ] **Step 4: Draai de test en zie hem slagen**

Run: `npm test -- storage`
Expected: PASS.

- [ ] **Step 5: Schrijf `src/state/AppState.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createTournament, reduce, type Action, type Settings, type Tournament } from '../domain/tournament'
import type { Chipset } from '../domain/chipset'
import {
  loadChipsets,
  loadPreferences,
  loadSettings,
  loadTournament,
  saveChipsets,
  savePreferences,
  saveSettings,
  saveTournament,
  type Preferences,
} from './storage'

type AppState = {
  tournament: Tournament | null
  settings: Settings | null
  chipsets: Chipset[]
  preferences: Preferences
  start: (settings: Settings, chipset: Chipset) => void
  dispatch: (action: Action) => void
  discard: () => void
  setChipsets: (chipsets: Chipset[]) => void
  setPreferences: (preferences: Preferences) => void
}

const Context = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(() => loadTournament())
  const [settings, setSettingsState] = useState<Settings | null>(() => loadSettings())
  const [chipsets, setChipsetsState] = useState<Chipset[]>(() => loadChipsets())
  const [preferences, setPreferencesState] = useState<Preferences>(() => loadPreferences())

  useEffect(() => saveTournament(tournament), [tournament])
  useEffect(() => saveChipsets(chipsets), [chipsets])
  useEffect(() => savePreferences(preferences), [preferences])

  const start = useCallback((nieuwe: Settings, chipset: Chipset) => {
    setSettingsState(nieuwe)
    saveSettings(nieuwe)
    setTournament(createTournament(nieuwe, chipset, Date.now()))
  }, [])

  const dispatch = useCallback((action: Action) => {
    setTournament((huidig) => (huidig ? reduce(huidig, action) : huidig))
  }, [])

  const discard = useCallback(() => setTournament(null), [])

  const waarde = useMemo<AppState>(
    () => ({
      tournament,
      settings,
      chipsets,
      preferences,
      start,
      dispatch,
      discard,
      setChipsets: setChipsetsState,
      setPreferences: setPreferencesState,
    }),
    [tournament, settings, chipsets, preferences, start, dispatch, discard],
  )

  return <Context.Provider value={waarde}>{children}</Context.Provider>
}

export function useAppState(): AppState {
  const waarde = useContext(Context)
  if (!waarde) throw new Error('useAppState moet binnen AppStateProvider gebruikt worden')
  return waarde
}
```

- [ ] **Step 6: Verifieer dat het bouwt**

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 7: Commit**

```bash
git add src/state
git commit -m "Voeg localStorage-opslag en app-state toe"
```

---

### Task 10: Palet en basiscomponenten

**Files:**
- Create: `src/styles/theme.css`, `src/styles/base.css`, `src/components/Button.tsx`, `src/components/Panel.tsx`, `src/components/ChipIcon.tsx`
- Modify: `src/main.tsx` (importeer de stylesheets)

**Interfaces:**
- Consumes: niets
- Produces: `<Button variant="primary" | "ghost" | "danger">`, `<Panel title?>`, `<ChipIcon color value size?>`

- [ ] **Step 1: Schrijf `src/styles/theme.css`**

Alle kleuren staan hier en nergens anders, zodat een andere skin één bestand wisselen is.

```css
:root {
  --felt-diep: #0d2c20;
  --felt: #123a2a;
  --felt-licht: #1c5240;
  --goud: #f0c542;
  --goud-donker: #c9a227;
  --creme: #f4ecdb;
  --creme-zacht: #8fae9c;
  --rood: #c0392b;

  --radius: 10px;
  --schaduw: 0 2px 10px rgba(0, 0, 0, 0.5);

  --serif: Georgia, 'Times New Roman', serif;
  --sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 2: Schrijf `src/styles/base.css`**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 15%, var(--felt-licht) 0%, var(--felt-diep) 75%);
  color: var(--creme);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}

button {
  font: inherit;
  cursor: pointer;
}

.knop {
  border: 1px solid rgba(240, 197, 66, 0.4);
  border-radius: var(--radius);
  background: rgba(240, 197, 66, 0.15);
  color: var(--goud);
  padding: 0.6rem 1.1rem;
}

.knop:hover {
  background: rgba(240, 197, 66, 0.25);
}

.knop--primair {
  background: var(--goud);
  color: #3a2c00;
  border-color: var(--goud-donker);
  font-weight: 700;
}

.knop--ghost {
  background: transparent;
  color: var(--creme-zacht);
  border-color: rgba(255, 255, 255, 0.15);
}

.knop--gevaar {
  background: rgba(192, 57, 43, 0.2);
  border-color: rgba(192, 57, 43, 0.5);
  color: #f0a79f;
}

.paneel {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius);
  padding: 1rem;
}

.paneel__titel {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--goud-donker);
}
```

- [ ] **Step 3: Schrijf de drie componenten**

`src/components/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const KLASSEN = {
  primary: 'knop knop--primair',
  ghost: 'knop knop--ghost',
  danger: 'knop knop--gevaar',
} as const

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button className={`${KLASSEN[variant]} ${className}`.trim()} {...rest} />
}
```

`src/components/Panel.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="paneel">
      {title && <h2 className="paneel__titel">{title}</h2>}
      {children}
    </section>
  )
}
```

`src/components/ChipIcon.tsx`:

```tsx
/**
 * Een fiche als SVG. Bewust geen sprite: de kleuren komen uit de chipset die de
 * gebruiker zelf instelt, dus een gekleurde vorm past beter dan een vaste
 * afbeelding. Taak 15 vervangt dit desgewenst door een Kenney-sprite.
 */
export function ChipIcon({ color, value, size = 28 }: { color: string; value?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`fiche ${value ?? ''}`}>
      <circle cx="20" cy="20" r="18" fill={color} stroke="rgba(0,0,0,.35)" strokeWidth="2" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeDasharray="5 4" />
      {value !== undefined && (
        <text x="20" y="25" textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(0,0,0,.7)">
          {value}
        </text>
      )}
    </svg>
  )
}
```

- [ ] **Step 4: Importeer de stylesheets in `src/main.tsx`**

Voeg boven de bestaande imports toe:

```tsx
import './styles/theme.css'
import './styles/base.css'
```

- [ ] **Step 5: Verifieer**

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components src/main.tsx
git commit -m "Voeg vilt-en-goud palet met basiscomponenten toe"
```

---

### Task 11: Tafelscherm

Het scherm dat de hele avond op tafel staat. Aftelling het grootst, blinds eronder, spelers onderaan, pauzeknop rechtsonder.

**Files:**
- Create: `src/screens/TournamentScreen.tsx`, `src/screens/TournamentScreen.css`, `src/hooks/useNow.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAppState` uit `../state/AppState`; `currentLevel`, `nextLevel`, `remainingMs`, `playersLeft`, `averageStackInBigBlinds`, `colorUpAt` uit `../domain/tournament`
- Produces: `<TournamentScreen />`, `useNow(intervalMs): number`

- [ ] **Step 1: Schrijf `src/hooks/useNow.ts`**

```ts
import { useEffect, useState } from 'react'

/**
 * Geeft de huidige tijd, elke `intervalMs` opnieuw. De klok in het domein rekent
 * met deze waarde; hier wordt alleen bepaald hoe vaak er hertekend wordt.
 */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
```

- [ ] **Step 2: Schrijf `src/screens/TournamentScreen.css`**

```css
.tafel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100vh;
  padding: 1.25rem;
}

.tafel--gepauzeerd {
  filter: brightness(0.45);
}

.tafel__balk {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--goud-donker);
}

.tafel__midden {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
}

.tafel__klok {
  font-family: var(--serif);
  font-weight: 700;
  font-size: clamp(4rem, 22vw, 14rem);
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-shadow: var(--schaduw);
  font-variant-numeric: tabular-nums;
}

.tafel__blinds {
  font-family: var(--serif);
  font-weight: 700;
  font-size: clamp(2rem, 9vw, 5rem);
  color: var(--goud);
  line-height: 1;
}

.tafel__onder {
  font-size: 0.95rem;
  color: var(--creme-zacht);
}

.tafel__colorup {
  color: var(--goud);
  font-weight: 600;
}

.tafel__voet {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.tafel__spelers {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.speler {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(240, 197, 66, 0.3);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  color: var(--creme);
  font-size: 0.95rem;
}

.speler--uit {
  opacity: 0.35;
  text-decoration: line-through;
  border-color: transparent;
}

.tafel__pauzeknop {
  min-width: 8rem;
  min-height: 3.5rem;
  font-size: 1.1rem;
}

.pauze-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  font-size: clamp(2rem, 10vw, 6rem);
  color: var(--goud);
  letter-spacing: 0.08em;
  pointer-events: none;
}
```

- [ ] **Step 3: Schrijf `src/screens/TournamentScreen.tsx`**

```tsx
import { useEffect } from 'react'
import { Button } from '../components/Button'
import { useNow } from '../hooks/useNow'
import { useAppState } from '../state/AppState'
import {
  averageStackInBigBlinds,
  colorUpAt,
  currentLevel,
  nextLevel,
  playersLeft,
  remainingMs,
} from '../domain/tournament'
import './TournamentScreen.css'

function formatteerTijd(ms: number): string {
  const totaal = Math.ceil(ms / 1000)
  const minuten = Math.floor(totaal / 60)
  const seconden = totaal % 60
  return `${minuten}:${String(seconden).padStart(2, '0')}`
}

export function TournamentScreen() {
  const { tournament, dispatch, discard } = useAppState()
  const now = useNow()

  // De reducer beslist zelf of er iets moet gebeuren; hier wordt alleen de tijd
  // doorgegeven.
  useEffect(() => {
    dispatch({ type: 'tick', now })
  }, [now, dispatch])

  if (!tournament) return null

  const level = currentLevel(tournament)
  const volgende = nextLevel(tournament)
  const gepauzeerd = tournament.clock.state === 'paused'
  const colorUp = colorUpAt(tournament, tournament.levelIndex)
  const resterend = remainingMs(tournament, now)
  const pot = Math.round(tournament.settings.buyIn * tournament.players.length)
  const telAfOpTijd = tournament.settings.trigger !== 'elimination'

  return (
    <>
      <div className={`tafel${gepauzeerd ? ' tafel--gepauzeerd' : ''}`}>
        <div className="tafel__balk">
          <span>
            Level {tournament.levelIndex + 1} · {playersLeft(tournament)} spelers
          </span>
          <span>Pot € {pot}</span>
        </div>

        <div className="tafel__midden">
          <div className="tafel__klok">
            {telAfOpTijd
              ? formatteerTijd(resterend)
              : formatteerTijd(now - tournament.startedAt - tournament.pausedMs)}
          </div>
          <div className="tafel__blinds">
            {level.smallBlind} / {level.bigBlind}
          </div>
          <div className="tafel__onder">
            {volgende ? `volgende ${volgende.smallBlind} / ${volgende.bigBlind}` : 'laatste level'} ·
            gemiddelde stack {averageStackInBigBlinds(tournament).toFixed(1)} BB
          </div>
          {colorUp && (
            <div className="tafel__colorup">
              Color-up: haal {colorUp.retiredColors.join(', ')} uit het spel en wissel naar{' '}
              {colorUp.nextValue}.
            </div>
          )}
        </div>

        <div className="tafel__voet">
          <div className="tafel__spelers">
            {tournament.players.map((speler, index) => (
              <button
                key={speler.name + index}
                className={`speler${speler.out ? ' speler--uit' : ''}`}
                onClick={() => !speler.out && dispatch({ type: 'playerOut', index, now: Date.now() })}
              >
                {speler.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => dispatch({ type: 'undo' })}>
              Ongedaan maken
            </Button>
            <Button variant="ghost" onClick={discard}>
              Stoppen
            </Button>
            <Button
              className="tafel__pauzeknop"
              onClick={() => dispatch({ type: 'togglePause', now: Date.now() })}
            >
              {gepauzeerd ? 'Hervatten' : 'Pauze'}
            </Button>
          </div>
        </div>
      </div>
      {gepauzeerd && <div className="pauze-overlay">GEPAUZEERD</div>}
    </>
  )
}
```

- [ ] **Step 4: Toon het scherm vanuit `src/App.tsx`**

```tsx
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'

function Inhoud() {
  const { tournament } = useAppState()
  if (!tournament) return <p style={{ padding: '2rem' }}>Nog geen toernooi — de setup volgt in taak 12.</p>
  return <TournamentScreen />
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
```

- [ ] **Step 5: Verifieer met de hand**

Run: `npm run dev`

Open de app, en controleer in de browserconsole dat een toernooi gestart kan worden:

```js
localStorage.clear()
```

Het scherm toont nu de tekst uit `Inhoud`. Het tafelscherm zelf wordt in taak 12
bereikbaar via de setup. Controleer in deze taak alleen dat `npm run build`
slaagt en er geen TypeScript-fouten zijn.

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 6: Commit**

```bash
git add src/screens src/hooks src/App.tsx
git commit -m "Voeg tafelscherm met klok, blinds, spelers en pauzeknop toe"
```

---

### Task 12: Setupscherm

**Files:**
- Create: `src/screens/SetupScreen.tsx`, `src/screens/SetupScreen.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAppState`; `buildStructure` uit `../domain/blinds`; `distributeChips` uit `../domain/distribution`; `calculatePayouts` uit `../domain/payout`; `setupWarnings` uit `../domain/warnings`
- Produces: `<SetupScreen />`

- [ ] **Step 1: Schrijf `src/screens/SetupScreen.css`**

```css
.setup {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
}

.setup__titel {
  font-family: var(--serif);
  font-size: 2rem;
  margin: 0;
}

.setup__raster {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.veld {
  display: grid;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}

.veld > span {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--goud-donker);
}

.veld input,
.veld select,
.veld textarea {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: var(--creme);
}

.melding {
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.melding--error {
  background: rgba(192, 57, 43, 0.2);
  border: 1px solid rgba(192, 57, 43, 0.5);
}

.melding--warning {
  background: rgba(240, 197, 66, 0.12);
  border: 1px solid rgba(240, 197, 66, 0.4);
}

.structuur {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.structuur th,
.structuur td {
  text-align: left;
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.uitleg {
  font-size: 0.85rem;
  color: var(--creme-zacht);
  margin: 0.5rem 0 0;
}
```

- [ ] **Step 2: Schrijf `src/screens/SetupScreen.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { useAppState } from '../state/AppState'
import { buildStructure } from '../domain/blinds'
import { distributeChips } from '../domain/distribution'
import { calculatePayouts } from '../domain/payout'
import { setupWarnings } from '../domain/warnings'
import type { Settings, Trigger } from '../domain/tournament'
import type { StructureKind } from '../domain/blinds'
import './SetupScreen.css'

const STANDAARD_NAMEN = 'Sam\nIlse\nJoost\nMax\nNadia\nRavi'

export function SetupScreen() {
  const { chipsets, settings, start } = useAppState()

  const [namenTekst, setNamenTekst] = useState(
    settings ? settings.playerNames.join('\n') : STANDAARD_NAMEN,
  )
  const [buyIn, setBuyIn] = useState(settings?.buyIn ?? 10)
  const [startingStack, setStartingStack] = useState(settings?.startingStack ?? 100)
  const [levelMinutes, setLevelMinutes] = useState(settings?.levelMinutes ?? 15)
  const [durationMinutes, setDurationMinutes] = useState(settings?.durationMinutes ?? 180)
  const [structure, setStructure] = useState<StructureKind>(settings?.structure ?? 'doubling')
  const [trigger, setTrigger] = useState<Trigger>(settings?.trigger ?? 'both')
  const [chipsetId, setChipsetId] = useState(settings?.chipsetId ?? chipsets[0].id)

  const chipset = chipsets.find((c) => c.id === chipsetId) ?? chipsets[0]
  const playerNames = namenTekst
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean)

  const huidigeSettings: Settings = {
    playerNames,
    buyIn,
    startingStack,
    levelMinutes,
    durationMinutes,
    structure,
    trigger,
    chipsetId: chipset.id,
  }

  const structuur = useMemo(
    () =>
      buildStructure(
        {
          kind: structure,
          players: Math.max(playerNames.length, 2),
          startingStack,
          durationMinutes,
          levelMinutes,
        },
        chipset,
      ),
    [structure, playerNames.length, startingStack, durationMinutes, levelMinutes, chipset],
  )

  const verdeling = useMemo(
    () =>
      distributeChips(
        chipset,
        Math.max(playerNames.length, 1),
        startingStack,
        structuur.levels[0]?.smallBlind ?? 1,
      ),
    [chipset, playerNames.length, startingStack, structuur],
  )

  const uitbetalingen = calculatePayouts(buyIn, Math.max(playerNames.length, 1))
  const meldingen = setupWarnings(huidigeSettings, structuur, verdeling)
  const kanStarten = !meldingen.some((m) => m.level === 'error')

  return (
    <div className="setup">
      <h1 className="setup__titel">PokerNight</h1>

      {meldingen.map((melding, i) => (
        <div key={i} className={`melding melding--${melding.level}`}>
          {melding.message}
        </div>
      ))}

      <div className="setup__raster">
        <Panel title="Spelers">
          <label className="veld">
            <span>Namen, één per regel</span>
            <textarea rows={7} value={namenTekst} onChange={(e) => setNamenTekst(e.target.value)} />
          </label>
          <label className="veld">
            <span>Inleg per speler (€)</span>
            <input type="number" min={0} step={0.5} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
          </label>
        </Panel>

        <Panel title="Toernooi">
          <label className="veld">
            <span>Startstack (fiches)</span>
            <input type="number" min={1} value={startingStack} onChange={(e) => setStartingStack(Number(e.target.value))} />
          </label>
          <label className="veld">
            <span>Duur (minuten)</span>
            <input type="number" min={15} step={15} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          </label>
          <label className="veld">
            <span>Levellengte</span>
            <select value={levelMinutes} onChange={(e) => setLevelMinutes(Number(e.target.value))}>
              <option value={10}>10 minuten</option>
              <option value={15}>15 minuten</option>
              <option value={20}>20 minuten</option>
            </select>
          </label>
        </Panel>

        <Panel title="Blinds">
          <label className="veld">
            <span>Hoe de blinds groeien</span>
            <select value={structure} onChange={(e) => setStructure(e.target.value as StructureKind)}>
              <option value="doubling">Verdubbelen per level</option>
              <option value="calculated">Berekend, vloeiend oplopend</option>
            </select>
          </label>
          <label className="veld">
            <span>Wanneer ze omhoog gaan</span>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)}>
              <option value="both">Op de klok én als iemand eruit gaat</option>
              <option value="time">Alleen op de klok</option>
              <option value="elimination">Alleen als iemand eruit gaat</option>
            </select>
          </label>
          <label className="veld">
            <span>Chipset</span>
            <select value={chipsetId} onChange={(e) => setChipsetId(e.target.value)}>
              {chipsets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </Panel>
      </div>

      <Panel title="Blindstructuur">
        <table className="structuur">
          <thead>
            <tr>
              <th>Level</th>
              <th>Blinds</th>
              <th>Vanaf</th>
            </tr>
          </thead>
          <tbody>
            {structuur.levels.map((level) => (
              <tr key={level.index}>
                <td>{level.index + 1}</td>
                <td>
                  {level.smallBlind} / {level.bigBlind}
                </td>
                <td>{level.index * levelMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        {structuur.colorUps.map((colorUp) => (
          <p key={colorUp.levelIndex} className="uitleg">
            Vanaf level {colorUp.levelIndex + 1}: {colorUp.retiredColors.join(', ')} uit het spel,
            wisselen naar {colorUp.nextValue}.
          </p>
        ))}
      </Panel>

      <div className="setup__raster">
        <Panel title="Fiches per speler">
          {verdeling.perPlayer.map((allocatie) => (
            <div key={allocatie.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <ChipIcon color={allocatie.color} value={allocatie.value} size={22} />
              <span>
                {allocatie.count}× {allocatie.name}
              </span>
            </div>
          ))}
          <p className="uitleg">Samen {verdeling.stackValue} fiches per speler.</p>
        </Panel>

        <Panel title="Prijzenpot">
          {uitbetalingen.map((uitbetaling) => (
            <div key={uitbetaling.place}>
              {uitbetaling.place}e plaats: € {uitbetaling.amount}
            </div>
          ))}
          <p className="uitleg">
            De pot ligt vast zodra het toernooi begint. Er zijn geen rebuys — een rebuy is opnieuw
            inleggen nadat je al je fiches kwijt bent, en die rekent deze app niet mee.
          </p>
        </Panel>
      </div>

      <Button disabled={!kanStarten} onClick={() => start(huidigeSettings, chipset)}>
        Start het toernooi
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Koppel de schermen in `src/App.tsx`**

```tsx
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SetupScreen } from './screens/SetupScreen'

function Inhoud() {
  const { tournament } = useAppState()
  return tournament ? <TournamentScreen /> : <SetupScreen />
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
```

- [ ] **Step 4: Verifieer met de hand**

Run: `npm run dev`

Controleer:
1. De setup toont een blindstructuur die oploopt.
2. "Start het toernooi" opent het tafelscherm met een lopende klok.
3. Op een spelernaam klikken streept hem door; bij trigger "beide" gaan de blinds omhoog.
4. De pauzeknop bevriest de klok en dimt het scherm; nog een druk hervat.
5. Pagina verversen tijdens het toernooi: het toernooi komt terug met de juiste resterende tijd.

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 5: Commit**

```bash
git add src/screens src/App.tsx
git commit -m "Voeg setupscherm met structuur, fiches en prijzenpot toe"
```

---

### Task 13: Herstelvraag bij openen

Bij het openen van de app moet een lopend toernooi niet stiekem doorgaan, maar een keuze opleveren.

**Files:**
- Create: `src/screens/ResumePrompt.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAppState`
- Produces: `<ResumePrompt onResume onDiscard />`

- [ ] **Step 1: Schrijf `src/screens/ResumePrompt.tsx`**

```tsx
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'

function tijdstip(ms: number): string {
  return new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function ResumePrompt({
  startedAt,
  onResume,
  onDiscard,
}: {
  startedAt: number
  onResume: () => void
  onDiscard: () => void
}) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <Panel title="Er loopt nog een toernooi">
        <p>Er is een toernooi gestart om {tijdstip(startedAt)}. Wat wil je doen?</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <Button onClick={onResume}>Hervatten</Button>
          <Button variant="ghost" onClick={onDiscard}>
            Nieuw toernooi
          </Button>
        </div>
      </Panel>
    </div>
  )
}
```

- [ ] **Step 2: Gebruik hem in `src/App.tsx`**

```tsx
import { useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SetupScreen } from './screens/SetupScreen'
import { ResumePrompt } from './screens/ResumePrompt'

function Inhoud() {
  const { tournament, discard } = useAppState()
  // Alleen bij het openen van de app vragen, niet nadat je zelf gestart bent.
  const [moetVragen, setMoetVragen] = useState(() => tournament !== null)

  if (tournament && moetVragen) {
    return (
      <ResumePrompt
        startedAt={tournament.startedAt}
        onResume={() => setMoetVragen(false)}
        onDiscard={() => {
          discard()
          setMoetVragen(false)
        }}
      />
    )
  }

  return tournament ? <TournamentScreen /> : <SetupScreen />
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
```

- [ ] **Step 3: Verifieer met de hand**

Run: `npm run dev`

Start een toernooi, ververs de pagina: de vraag verschijnt. "Hervatten" toont het
tafelscherm met de juiste tijd; "Nieuw toernooi" brengt je terug naar de setup.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ResumePrompt.tsx src/App.tsx
git commit -m "Vraag bij openen of een lopend toernooi hervat moet worden"
```

---

### Task 14: Geluid, wake lock en instellingen

**Files:**
- Create: `src/hooks/useWakeLock.ts`, `src/hooks/useLevelSound.ts`, `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/TournamentScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `useAppState`, `Preferences` uit `../state/storage`
- Produces: `useWakeLock(enabled: boolean): void`, `useLevelSound(levelIndex: number, enabled: boolean): void`, `<SettingsScreen onClose />`

- [ ] **Step 1: Schrijf `src/hooks/useWakeLock.ts`**

```ts
import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }

/**
 * Houdt het scherm aan zolang het toernooi loopt. Niet elke browser ondersteunt
 * dit; dan gebeurt er simpelweg niets.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const navigatorMetWakeLock = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
    }
    if (!navigatorMetWakeLock.wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let afgebroken = false

    const aanvragen = async () => {
      try {
        const nieuwe = await navigatorMetWakeLock.wakeLock!.request('screen')
        if (afgebroken) void nieuwe.release()
        else sentinel = nieuwe
      } catch {
        // Geweigerd of niet beschikbaar: het scherm valt dan gewoon in slaap.
      }
    }

    void aanvragen()

    // Na een tabwissel is de lock kwijt en moet hij opnieuw aangevraagd worden.
    const bijZichtbaar = () => {
      if (document.visibilityState === 'visible') void aanvragen()
    }
    document.addEventListener('visibilitychange', bijZichtbaar)

    return () => {
      afgebroken = true
      document.removeEventListener('visibilitychange', bijZichtbaar)
      void sentinel?.release()
    }
  }, [enabled])
}
```

- [ ] **Step 2: Schrijf `src/hooks/useLevelSound.ts`**

```ts
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
```

- [ ] **Step 3: Gebruik beide hooks in `TournamentScreen.tsx`**

Voeg toe aan de imports:

```tsx
import { useWakeLock } from '../hooks/useWakeLock'
import { useLevelSound } from '../hooks/useLevelSound'
```

En direct na `const { tournament, dispatch, discard } = useAppState()`:

```tsx
const { preferences } = useAppState()
useWakeLock(preferences.wakeLock && tournament?.clock.state === 'running')
useLevelSound(tournament?.levelIndex ?? 0, preferences.sound)
```

Let op: `useAppState()` mag maar één keer aangeroepen worden. Voeg `preferences`
toe aan de bestaande destructurering in plaats van een tweede aanroep:

```tsx
const { tournament, dispatch, discard, preferences } = useAppState()
```

- [ ] **Step 4: Schrijf `src/screens/SettingsScreen.tsx`**

Chipset-editor plus de twee schakelaars.

```tsx
import { useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { useAppState } from '../state/AppState'
import { PRESETS, type Chipset } from '../domain/chipset'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { chipsets, setChipsets, preferences, setPreferences } = useAppState()
  const [geselecteerd, setGeselecteerd] = useState(chipsets[0].id)
  const chipset = chipsets.find((c) => c.id === geselecteerd) ?? chipsets[0]

  const wijzig = (index: number, veld: 'name' | 'color' | 'value' | 'count', waarde: string) => {
    const nieuw: Chipset = {
      ...chipset,
      chips: chipset.chips.map((chip, i) =>
        i === index
          ? { ...chip, [veld]: veld === 'value' || veld === 'count' ? Number(waarde) : waarde }
          : chip,
      ),
    }
    setChipsets(chipsets.map((c) => (c.id === chipset.id ? nieuw : c)))
  }

  const voegToe = () => {
    const nieuw: Chipset = {
      ...chipset,
      chips: [...chipset.chips, { name: 'nieuw', color: '#cccccc', value: 1, count: 50 }],
    }
    setChipsets(chipsets.map((c) => (c.id === chipset.id ? nieuw : c)))
  }

  const verwijder = (index: number) => {
    const nieuw: Chipset = { ...chipset, chips: chipset.chips.filter((_, i) => i !== index) }
    setChipsets(chipsets.map((c) => (c.id === chipset.id ? nieuw : c)))
  }

  return (
    <div className="setup">
      <h1 className="setup__titel">Instellingen</h1>

      <Panel title="Chipset">
        <label className="veld">
          <span>Welke doos</span>
          <select value={geselecteerd} onChange={(e) => setGeselecteerd(e.target.value)}>
            {chipsets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {chipset.chips.map((chip, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
            <ChipIcon color={chip.color} value={chip.value} size={26} />
            <input value={chip.name} onChange={(e) => wijzig(index, 'name', e.target.value)} style={{ width: '7rem' }} />
            <input type="color" value={chip.color} onChange={(e) => wijzig(index, 'color', e.target.value)} />
            <input type="number" min={1} value={chip.value} onChange={(e) => wijzig(index, 'value', e.target.value)} style={{ width: '5rem' }} />
            <input type="number" min={0} value={chip.count} onChange={(e) => wijzig(index, 'count', e.target.value)} style={{ width: '6rem' }} />
            <Button variant="danger" onClick={() => verwijder(index)}>
              Weg
            </Button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Button variant="ghost" onClick={voegToe}>
            Kleur toevoegen
          </Button>
          <Button variant="ghost" onClick={() => setChipsets(PRESETS)}>
            Terug naar de presets
          </Button>
        </div>
      </Panel>

      <Panel title="Aan tafel">
        <label className="veld" style={{ gridTemplateColumns: 'auto 1fr', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(e) => setPreferences({ ...preferences, sound: e.target.checked })}
          />
          <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '1rem', color: 'var(--creme)' }}>
            Geluid bij een blindverhoging
          </span>
        </label>
        <label className="veld" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={preferences.wakeLock}
            onChange={(e) => setPreferences({ ...preferences, wakeLock: e.target.checked })}
          />
          <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '1rem', color: 'var(--creme)' }}>
            Scherm aan houden tijdens het toernooi
          </span>
        </label>
      </Panel>

      <Button onClick={onClose}>Terug</Button>
    </div>
  )
}
```

- [ ] **Step 5: Maak het scherm bereikbaar vanuit `src/App.tsx`**

Voeg een knop toe in de setup én een route-vlag:

```tsx
import { useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ResumePrompt } from './screens/ResumePrompt'
import { Button } from './components/Button'

function Inhoud() {
  const { tournament, discard } = useAppState()
  const [moetVragen, setMoetVragen] = useState(() => tournament !== null)
  const [instellingen, setInstellingen] = useState(false)

  if (tournament && moetVragen) {
    return (
      <ResumePrompt
        startedAt={tournament.startedAt}
        onResume={() => setMoetVragen(false)}
        onDiscard={() => {
          discard()
          setMoetVragen(false)
        }}
      />
    )
  }

  if (instellingen) return <SettingsScreen onClose={() => setInstellingen(false)} />
  if (tournament) return <TournamentScreen />

  return (
    <>
      <SetupScreen />
      <div style={{ maxWidth: '60rem', margin: '0 auto 2rem', padding: '0 1.5rem' }}>
        <Button variant="ghost" onClick={() => setInstellingen(true)}>
          Instellingen en chipsets
        </Button>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
```

- [ ] **Step 6: Verifieer met de hand**

Run: `npm run dev`

Controleer: de chipset-editor bewaart wijzigingen na een refresh, het geluid
klinkt bij een levelverhoging (zet de levellengte tijdelijk op 10 minuten en
gebruik trigger "alleen als iemand eruit gaat" om snel een level te verhogen),
en het scherm blijft aan tijdens een toernooi.

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 7: Commit**

```bash
git add src/hooks src/screens src/App.tsx
git commit -m "Voeg geluid, wake lock en instellingenscherm toe"
```

---

### Task 15: Kenney-assets

De app werkt zonder assets — fiches zijn SVG, het geluid is gegenereerd. Deze taak
voegt de Kenney-sprites toe als ze te downloaden zijn, en laat de app werken als
dat niet lukt.

**Files:**
- Create: `public/assets/` (sprites), `public/assets/HERKOMST.md`
- Modify: `src/components/Panel.tsx` of `src/styles/base.css` alleen als de sprites daadwerkelijk binnengehaald zijn

**Interfaces:**
- Consumes: niets
- Produces: bestanden in `public/assets/`, of een genoteerde reden waarom niet

- [ ] **Step 1: Probeer de packs te downloaden**

```bash
mkdir -p public/assets
curl -sSL -o /tmp/boardgame.zip "https://kenney.nl/media/pages/assets/boardgame-pack/boardgame-pack.zip"
curl -sSL -o /tmp/cards.zip "https://kenney.nl/media/pages/assets/playing-cards-pack/playing-cards-pack.zip"
```

Deze URL's zijn niet gegarandeerd stabiel. Controleer de bestandsgrootte:

```bash
ls -la /tmp/boardgame.zip /tmp/cards.zip
```

- [ ] **Step 2: Als het downloaden lukt, pak uit en dun uit**

Neem alleen wat de app gebruikt: een handvol fiche-sprites en desgewenst een
kaartrug voor decoratie. Alles CC0, dus zonder attributieplicht.

```bash
unzip -q -o /tmp/boardgame.zip -d /tmp/boardgame
find /tmp/boardgame -iname "*chip*" -o -iname "*token*" | head -20
```

Kopieer maximaal tien bestanden naar `public/assets/`.

- [ ] **Step 3: Als het downloaden niet lukt, stop hier en noteer dat**

Schrijf `public/assets/HERKOMST.md`:

```markdown
# Assets

De app gebruikt geen externe afbeeldingen. Fiches worden als SVG getekend in
`src/components/ChipIcon.tsx`, zodat ze de kleuren van de ingestelde chipset
volgen, en het signaal bij een blindverhoging wordt met de Web Audio API
gegenereerd.

Wil je Kenney-sprites gebruiken (allemaal CC0, geen attributie verplicht):

- Boardgame Pack — https://kenney.nl/assets/boardgame-pack
- Playing Cards Pack — https://kenney.nl/assets/playing-cards-pack
- UI Pack — https://kenney.nl/assets/ui-pack
- Interface Sounds — https://kenney.nl/assets/interface-sounds

Download ze met de hand, zet de gewenste bestanden in deze map en verwijs ernaar
vanuit `ChipIcon`, `Button` of `Panel`. Die drie componenten zijn met opzet de
enige plek waar het uiterlijk van een fiche, knop of paneel vastligt.
```

Dit is een geldige uitkomst van de taak, geen mislukking: de app is functioneel
compleet zonder de assets.

- [ ] **Step 4: Commit**

```bash
git add public/assets
git commit -m "Documenteer de herkomst van de assets"
```

---

### Task 16: Deploy naar GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: `npm run build` uit taak 1
- Produces: een workflow die `dist/` naar Pages publiceert

- [ ] **Step 1: Schrijf `.github/workflows/deploy.yml`**

```yaml
name: Deploy naar GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Schrijf `README.md`**

```markdown
# PokerNight

Tooling voor een pokeravond met vrienden: blinds timer, blindstructuur, fiches
verdelen en de prijzenpot verdelen. Eén scherm midden op tafel, verder niets
nodig — geen backend, geen account, werkt offline.

## Ontwikkelen

```bash
npm install
npm run dev      # ontwikkelserver
npm test         # unit tests op de rekenkern
npm run build    # statische build in dist/
```

## Opzet

`src/domain/` bevat alle rekenlogica als pure TypeScript: geen React, geen DOM,
geen klok. Tijd komt altijd als parameter binnen. Dat is de enige harde
architectuurregel — een fout in de blindberekening verpest een avond, dus die
kant is volledig getest.

Daarboven ligt een dunne React-schil: een reducer met `localStorage`-opslag en
drie schermen (setup, tafel, instellingen).

## Ontwerp

Zie `docs/superpowers/specs/2026-09-02-poker-night-design.md`.
```

- [ ] **Step 3: Verifieer lokaal wat de workflow doet**

Run: `npm ci && npm test && npm run build`
Expected: alle drie slagen.

- [ ] **Step 4: Commit**

```bash
git add .github README.md
git commit -m "Voeg GitHub Pages-workflow en README toe"
```

- [ ] **Step 5: STOP — vraag de gebruiker om toestemming voor de push**

De repo bestaat nog niet op GitHub. Het aanmaken en pushen publiceert de code
onder het account van de gebruiker; dat is een naar buiten gerichte actie die
expliciet bevestigd moet worden. Vraag het, en voer daarna uit:

```bash
gh repo create poker-night --public --source=. --remote=origin --push
```

Zet daarna in de repo-instellingen Pages op "GitHub Actions" als bron.

---

## Self-Review

**Spec coverage:**

| Spec-onderdeel | Taak |
|---|---|
| Chipset met vrije kleur/waarde/aantal, twee presets | 2 |
| Betaalbare bedragen, 1-2-5-ladder, strikt oplopend | 3 |
| Kleine blind uit big blind | 3 |
| Structuur berekend / verdubbelend / handmatig | 4 |
| Color-up bij tien keer de denominatie | 4 |
| Trigger tijd / eliminatie / beide | 7 |
| Eliminatie zet de leveltimer terug op vol | 7 |
| Pauzeknop, geen levelverhoging tijdens pauze | 7, 11 |
| Klok met eindtijdstip en bevroren resttijd | 7 |
| Undo | 7, 11 |
| Gemiddelde stack en stack in BB | 7, 11 |
| Prijzenpot, som exact de pot | 5 |
| Chipverdeling met tekortmeldingen | 6 |
| Waarschuwingen vóór de start | 8, 12 |
| localStorage, herstelvraag | 9, 13 |
| Drie schermen | 11, 12, 14 |
| Vilt en goud, palet in één bestand | 10 |
| Geluid bij blindverhoging | 14 |
| Wake lock | 14 |
| Volgende-blind-preview | 11 |
| Assets | 15 |
| GitHub Pages, base-pad | 1, 16 |

Geen gaten.

**Afwijkingen van de spec, bewust en genoteerd:**

1. **Fiches worden als SVG getekend, niet als sprite.** De kleuren komen uit de
   chipset die de gebruiker zelf instelt; een vaste afbeelding kan die niet
   volgen. De Kenney-assets blijven beschikbaar via taak 15 en de drie
   componenten waar het uiterlijk vastligt.
2. **Het geluid wordt gegenereerd met de Web Audio API** in plaats van een
   Kenney-geluidsbestand. Dat maakt de app onafhankelijk van een download die kan
   mislukken. Vervangen door een bestand is één hook aanpassen.
3. **Bij trigger "alleen eliminatie" telt de klok op** in plaats van af. De spec
   laat dit open; aftellen zou suggereren dat er iets gebeurt als de tijd om is,
   en dat is bij deze trigger niet zo.
4. **`levelCount` geeft minimaal twee levels.** De formule uit de spec kan bij een
   korte duur nul of één opleveren, waarmee de groeifactor door nul zou delen.
5. **De 1-2-5-ladder is vervangen door een meeschalende afrondstap.** De ladder
   uit de spec werkt alleen als de fichewaarde groot is ten opzichte van de
   blinds; bij fiches van 1 en blinds rond de 100 laat hij alleen 100, 200 en 500
   toe, waardoor een berekende structuur binnen drie levels ontspoort. Zie de
   toelichting bij taak 3. De spec is hierop bijgewerkt.
6. **De startwaarde is minstens twee fichewaardes.** Anders bestaat er geen kleine
   blind die strikt onder de big blind ligt en staat de hele reeks vanaf level 0
   scheef.
7. **`maxPlayers` betekent "het grootste aantal spelers zonder tekort".** De spec
   noemt alleen "het maximale aantal spelers dat wél past"; dat is berekend door
   terug te tellen tot de verdeling zonder klachten rondkomt.

**Placeholder scan:** geen TBD's, geen "handel fouten af", elke stap bevat de
werkelijke code of het werkelijke commando.

**Type consistency:** `Chipset`, `Chip`, `BlindLevel`, `ColorUp`, `Structure`,
`Settings`, `Trigger`, `Clock`, `Tournament`, `Action`, `Allocation`,
`Distribution`, `Warning` en `Preferences` worden overal met dezelfde velden
gebruikt. `Clock` krijgt in taak 7 stap 4 een extra veld `pausedAt`; alle latere
taken gebruiken die uitgebreide vorm.
