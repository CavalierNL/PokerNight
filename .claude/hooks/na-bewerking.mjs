#!/usr/bin/env node
// PostToolUse-hook: draait na elke Edit/Write en bewaakt de twee dingen die dit
// project verder nergens automatisch controleert — er is geen linter, en de
// pure-domeinregel staat alleen in CLAUDE.md.
//
// Exitcode 2 geeft de melding op stderr terug aan Claude; 0 is stil doorgaan.
// Bij een onverwachte fout in deze hook zelf: exit 0. Een kapotte hook mag geen
// bewerkingen blokkeren.

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const VERBODEN = [
  { patroon: /\bDate\.now\(/, uitleg: 'Date.now() — tijd hoort als parameter binnen te komen' },
  { patroon: /\bfrom ['"]react/, uitleg: 'een React-import' },
  { patroon: /\b(document|window|localStorage)\./, uitleg: 'de DOM of browseropslag' },
]

function lees() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

/** Alle .ts/.tsx onder src/domain, inclusief de tests: die moeten net zo puur zijn. */
function domeinBestanden() {
  return readdirSync('src/domain')
    .filter((naam) => /\.tsx?$/.test(naam))
    .map((naam) => join('src/domain', naam))
}

function controleerDomein() {
  const klachten = []
  for (const pad of domeinBestanden()) {
    const regels = readFileSync(pad, 'utf8').split('\n')
    regels.forEach((regel, i) => {
      for (const { patroon, uitleg } of VERBODEN) {
        if (patroon.test(regel)) klachten.push(`${pad}:${i + 1} bevat ${uitleg}`)
      }
    })
  }
  return klachten
}

function typecheck() {
  try {
    // Als één string, niet als argumentenlijst: op Windows heeft npx een shell
    // nodig, en `shell: true` mét losse argumenten levert een DeprecationWarning
    // bij elke bewerking op.
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    return null
  } catch (fout) {
    return `${fout.stdout ?? ''}${fout.stderr ?? ''}`.trim()
  }
}

try {
  const invoer = lees()
  // Windows levert het pad met backslashes, een POSIX-shell met schuine strepen.
  // Eerst gelijktrekken, dan pas matchen — anders glipt op Windows alles langs
  // de filter hieronder en controleert deze hook stilletjes niets.
  const pad = (invoer?.tool_input?.file_path ?? '').split(String.fromCharCode(92)).join('/')
  // Alleen op TypeScript in de broncode; een bewerking aan een md- of css-bestand
  // hoeft geen typecheck van een halve seconde te kosten.
  if (!/\.tsx?$/.test(pad) || !/\/(src|e2e)\//.test(pad)) process.exit(0)

  const klachten = controleerDomein()
  if (klachten.length > 0) {
    console.error(
      'src/domain moet puur blijven: geen React, geen DOM, geen klok.\n' +
        klachten.join('\n') +
        '\nHaal dit weg, of verplaats de logica naar src/state of src/screens.',
    )
    process.exit(2)
  }

  const fouten = typecheck()
  if (fouten) {
    console.error(`tsc --noEmit faalt:\n${fouten}`)
    process.exit(2)
  }
} catch {
  process.exit(0)
}
