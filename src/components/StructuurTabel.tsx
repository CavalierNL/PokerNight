import type { BlindLevel } from '../domain/blinds'

/**
 * De hele blindstructuur als tabel. Gedeeld door de configuratie, waar je hem
 * leest voordat je begint, en het schema aan tafel, waar je hem opzoekt tijdens
 * het spelen — dezelfde tabel, zodat wat je vooraf zag ook is wat je terugvindt.
 *
 * De kolom "vanaf" is de geplande starttijd vanaf het begin van het toernooi;
 * pauzes schuiven die in werkelijkheid op.
 */
export function StructuurTabel({
  levels,
  levelMinutes,
  huidigLevel,
}: {
  levels: BlindLevel[]
  levelMinutes: number
  /** Het level dat nu gespeeld wordt; krijgt nadruk. Weglaten in de configuratie. */
  huidigLevel?: number
}) {
  return (
    <table className="structuur">
      <thead>
        <tr>
          <th>Level</th>
          <th>Blinds</th>
          <th>Vanaf</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((level) => (
          <tr
            key={level.index}
            className={level.index === huidigLevel ? 'structuur__nu' : undefined}
          >
            <td>{level.index + 1}</td>
            <td>
              {level.smallBlind} / {level.bigBlind}
            </td>
            <td>{level.index * levelMinutes} min</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
