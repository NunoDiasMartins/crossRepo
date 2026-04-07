import { A2UIRenderer } from './renderers/A2UIRenderer';
import { useSession } from './state/useSession';
import type { UIInteractionEvent } from '@demo/shared';
import './styles.css';

function App() {
  const { sessionId, status, events, surfaces, runPrompt, dispatch } = useSession();

  const sendControlAction = async (event: UIInteractionEvent) => {
    if (event.type === 'action.triggered' && event.payload.action === 'drill') {
      const latestAnomaly = events
        .filter((e) => e.type.includes('anomalies.detected'))
        .slice(-1)[0]
        ?.data as { surface?: { children?: Array<{ id?: string }> } } | undefined;
      const firstAnomaly = latestAnomaly?.surface?.children?.[0]?.id;
      if (firstAnomaly) {
        await dispatch({ type: 'anomaly.selected', payload: { week: firstAnomaly } });
        return;
      }
    }

    await dispatch(event);
  };

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>AG-UI + A2UI Agentic Data Workspace</h1>
          <p>Session: {sessionId}</p>
        </div>
        <div className={`status ${status}`}>{status.toUpperCase()}</div>
      </header>

      <section className="prompt-card">
        <p>Analyze last quarter sales, identify anomalies, and explain what caused them.</p>
        <button onClick={runPrompt}>Start backend analysis run</button>
      </section>

      <section className="dashboard-grid">
        {surfaces.map((surface) => (
          <article key={surface.id} className="surface-card">
            <h2>{surface.title}</h2>
            <A2UIRenderer node={surface} onAction={sendControlAction} />
          </article>
        ))}
      </section>

      <section className="event-panel">
        <h3>Streamed AG-UI Events</h3>
        <ol>
          {events.slice(-30).map((event, idx) => (
            <li key={`${event.type}-${idx}`}>{event.type}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default App;
