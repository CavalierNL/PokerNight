import type { Chipset } from './chipset'

/**
 * Een doos met vier kleuren en maar twee waardes. Stond vroeger als preset in de
 * app onder de naam "Huisregel (5 en 1)"; die rol is overgenomen door de
 * huisregel-instelling, die elke doos naar twee waardes kan platslaan.
 *
 * Blijft hier staan omdat de rekenkern een doos met weinig waardes moet blijven
 * aankunnen: geen color-up, blinds die op 1 en 5 te leggen zijn. Wordt alleen
 * door tests gebruikt en zit dus niet in de bundel.
 */
export const KLEINE_DOOS: Chipset = {
  id: 'klein',
  name: 'Kleine doos',
  chips: [
    { color: '#f2efe6', value: 1, count: 150 },
    { color: '#c0392b', value: 1, count: 100 },
    { color: '#2e6da4', value: 1, count: 100 },
    { color: '#2e8b57', value: 5, count: 150 },
  ],
}
