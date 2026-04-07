import { useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { AnalyticsAgent } from './agent';
import type { A2UINode, AgentEvent, UIEvent } from './types';
import './styles.css';

type SurfaceRegistry = Record<string, A2UINode>;

const agent = new AnalyticsAgent({
  agentId: 'analytics-agent',
  threadId: 'demo-thread'
} as never);

function App() {
  const [surfaces, setSurfaces] = useState<SurfaceRegistry>({});
  const [eventLog, setEventLog] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState('Idle');
  const [streamText, setStreamText] = useState('');

  const runAgent = (uiEvent?: UIEvent) => {
    setStatus('Agent is working...');

    const runner = agent.run({
      threadId: 'demo-thread',
      runId: crypto.randomUUID(),
      context: uiEvent ? { uiEvent } : {}
    } as never);

    let sub: Subscription | undefined;
    sub = runner().subscribe({
      next: (event: AgentEvent) => {
        setEventLog((prev) => [...prev, event]);

        if (event.type === 'state.updated') {
          const nextState = (event.data as { state: { surfaces: SurfaceRegistry } }).state;
          setSurfaces({ ...nextState.surfaces });
        }

        if (event.type === 'replay.ready') {
          const replayEvents = (event.data as AgentEvent[]) ?? [];
          setSurfaces({});
          replayEvents.forEach((item, idx) => {
            setTimeout(() => {
              if (item.type === 'state.updated') {
                const replayState = (item.data as { state: { surfaces: SurfaceRegistry } }).state;
                setSurfaces({ ...replayState.surfaces });
              }
            }, idx * 120);
          });
        }

        if (event.type === 'text_message_content' || event.type === 'TEXT_MESSAGE_CONTENT') {
          setStreamText((prev) => `${prev}${event.delta ?? ''}`);
        }

        if (event.type === 'run_finished' || event.type === 'RUN_FINISHED') {
          setStatus('Idle');
          sub?.unsubscribe();
        }
      },
      error: () => setStatus('Agent failed')
    });
  };

  const sortedSurfaces = useMemo(
    () => Object.values(surfaces).sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '')),
    [surfaces]
  );

  return (
    <main className="layout">
      <header>
        <h1>Agentic Data Workspace (AG-UI + A2UI)</h1>
        <p>{status}</p>
        <button onClick={() => runAgent()}>Run Demo Prompt</button>
      </header>

      <section className="stream">
        <h2>Message Stream</h2>
        <p>{streamText || 'No streamed text yet.'}</p>
      </section>

      <section className="workspace">
        {sortedSurfaces.map((surface) => (
          <article key={surface.id} className="surface">
            <h3>{surface.title ?? surface.id}</h3>
            <A2UIRenderer node={surface} onAction={runAgent} />
          </article>
        ))}
      </section>

      <section className="events">
        <h2>Event Timeline</h2>
        <ol>
          {eventLog.slice(-20).map((event, idx) => (
            <li key={`${event.type}-${idx}`}>{event.type}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function A2UIRenderer({ node, onAction }: { node: A2UINode; onAction: (event: UIEvent) => void }) {
  if (!node.children) {
    return null;
  }

  return (
    <div className="a2ui-root">
      {node.children.map((child, index) => {
        if (child.type === 'text') {
          return <p key={index}>{child.text}</p>;
        }

        if (child.type === 'list') {
          return (
            <ul key={index}>
              {child.items?.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        }

        if (child.type === 'table') {
          const rows = child.rows ?? [];
          const columns = rows[0] ? Object.keys(rows[0]) : [];
          return (
            <table key={index}>
              <thead>
                <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ridx) => (
                  <tr key={ridx}>
                    {columns.map((col) => (
                      <td key={col}>{String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

        if (child.type === 'chart') {
          return (
            <div key={index} className="chart">
              {(child.points ?? []).map((point) => (
                <div
                  key={`${point.week}`}
                  className={`chart-point ${point.highlight ? 'highlight' : ''}`}
                  title={`${point.week}: ${point.revenue}`}
                >
                  <button
                    onClick={() => onAction({ type: 'anomaly.selected', payload: { week: String(point.week) } })}
                  >
                    {point.week}: {point.revenue}
                  </button>
                </div>
              ))}
            </div>
          );
        }

        if (child.type === 'card') {
          return (
            <div key={index} className="card">
              <strong>{child.title}</strong>
              <p>{child.text}</p>
            </div>
          );
        }

        if (child.type === 'actions') {
          return (
            <div key={index} className="actions">
              {child.actions?.map((action) => (
                <button key={action.id} onClick={() => onAction(action.event)}>
                  {action.label}
                </button>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default App;
