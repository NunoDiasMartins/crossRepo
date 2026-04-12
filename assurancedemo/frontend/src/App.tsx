import { useEffect, useMemo, useState } from 'react';
import { KpiCorrelationPanel } from './components/KpiCorrelationPanel';
import { RcaPanel } from './components/RcaPanel';
import { ResolutionPanel } from './components/ResolutionPanel';
import { ServiceOverviewCard } from './components/ServiceOverviewCard';
import { TopologyView } from './components/TopologyView';
import type { ActionType, AppState, SurfaceSchema, TimelineItem } from './types';
import './styles.css';

const ACTIONS: ActionType[] = ['VIEW_IMPACT', 'ANALYZE_KPIS', 'SHOW_RCA', 'APPLY_FIX', 'RESET_DEMO'];
const labels: Record<ActionType, string> = {
  VIEW_IMPACT: 'View Impact',
  ANALYZE_KPIS: 'Analyze KPIs',
  SHOW_RCA: 'Show RCA',
  APPLY_FIX: 'Apply Fix',
  RESET_DEMO: 'Reset Demo'
};

const API = 'http://localhost:8787';

export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [appState, setAppState] = useState<AppState>({});
  const [surface, setSurface] = useState<SurfaceSchema | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<ActionType[]>(ACTIONS);

  useEffect(() => {
    async function start() {
      const res = await fetch(`${API}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            selectedService: 'enterprise-surveillance-slice',
            regionScope: 'west-metro'
          },
          uiCapabilities: [
            'ServiceOverviewCard',
            'TopologyView',
            'KpiCorrelationPanel',
            'RcaPanel',
            'ResolutionPanel'
          ]
        })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setAppState(data.initialState);
    }
    start().catch(console.error);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const source = new EventSource(`${API}/api/events?sessionId=${sessionId}`);

    source.addEventListener('agent.message.delta', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'agent', text: data.message, badge: 'stream' }]);
    });

    source.addEventListener('agent.message.completed', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'agent', text: data.message, badge: data.badge || 'Agent event' }]);
    });

    source.addEventListener('incident.detected', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `${data.symptom} (${data.impactedEndpoints} impacted)`, badge: 'Incident' }]);
    });

    ['ui.surface.replace', 'rca.identified', 'remediation.proposed', 'remediation.completed', 'tool.invocation.requested', 'tool.invocation.completed'].forEach((evtName) => {
      source.addEventListener(evtName, (evt) => {
        const data = JSON.parse((evt as MessageEvent).data);
        if (evtName === 'ui.surface.replace') setSurface(data);
        setTimeline((prev) => [...prev, { kind: 'event', text: `${evtName}`, badge: data.badge || 'UI update' }]);
      });
    });

    source.addEventListener('ui.action.suggested', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setSuggestedActions(data.actions);
    });

    return () => source.close();
  }, [sessionId]);

  async function sendAction(action: ActionType) {
    if (!sessionId) return;
    setTimeline((prev) => [...prev, { kind: 'user', text: labels[action] }]);
    await fetch(`${API}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        action,
        stateSnapshot: {
          currentSurface: surface?.surface ?? null,
          selectedService: appState.service?.id ?? null
        },
        visibleContext: {
          entities: appState.entities ?? null,
          alarms: appState.alarms ?? []
        }
      })
    });
  }

  const renderedSurface = useMemo(() => {
    if (!surface || !appState.service) return <div className="empty-surface">Awaiting agent-composed UI surface...</div>;
    if (surface.component === 'ServiceOverviewCard') {
      return <ServiceOverviewCard title={surface.title} serviceName={appState.service.name} metrics={(surface.props as any).metrics} sparkline={(surface.props as any).sparkline} />;
    }
    if (surface.component === 'TopologyView') return <TopologyView title={surface.title} nodes={(surface.props as any).nodes} edges={(surface.props as any).edges} blastRadius={(surface.props as any).blastRadius} />;
    if (surface.component === 'KpiCorrelationPanel') return <KpiCorrelationPanel title={surface.title} series={(surface.props as any).series} insight={(surface.props as any).insight} />;
    if (surface.component === 'RcaPanel') return <RcaPanel title={surface.title} confidence={(surface.props as any).confidence} rootCause={(surface.props as any).rootCause} tree={(surface.props as any).tree} propagation={(surface.props as any).propagation} />;
    return <ResolutionPanel title={surface.title} beforeAfter={(surface.props as any).beforeAfter} recoveredDevices={(surface.props as any).recoveredDevices} timeline={(surface.props as any).timeline} />;
  }, [surface, appState]);

  return (
    <div className="app-shell">
      <header>
        <h1>Agent-First Assurance Demo</h1>
        <span className="badge">Mock EDC Demo</span>
        <select value={appState.service?.id}>
          <option value="enterprise-surveillance-slice">Enterprise Surveillance Slice</option>
        </select>
      </header>
      <main>
        <aside className="panel timeline-panel">
          <h2>Chat / Agent Timeline</h2>
          {timeline.map((item, idx) => (
            <div className={`timeline-item ${item.kind}`} key={`${item.kind}-${idx}`}>
              <p>{item.text}</p>
              {item.badge ? <small>{item.badge}</small> : null}
            </div>
          ))}
        </aside>

        <section className="panel work-panel">{renderedSurface}</section>

        <aside className="panel context-panel">
          <h2>Context / Actions</h2>
          <div className="alarm-card">
            <h4>Current alarm summary</h4>
            {appState.alarms?.map((alarm) => (
              <p key={alarm.id}>{alarm.id} · {alarm.severity} · {alarm.text}</p>
            ))}
          </div>
          <div className="entity-list">
            <h4>Detected entities</h4>
            <p>Slice: {appState.entities?.slice}</p>
            <p>Region: {appState.entities?.region}</p>
            <p>gNBs: {appState.entities?.impactedGnbs.join(', ')}</p>
            <p>Cells: {appState.entities?.impactedCells.join(', ')}</p>
            <p>Transport path: {appState.entities?.transportPath}</p>
          </div>
          <div className="actions">
            {ACTIONS.map((action) => (
              <button key={action} disabled={!suggestedActions.includes(action)} onClick={() => sendAction(action)}>
                {labels[action]}
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
