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
