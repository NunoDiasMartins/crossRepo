import { useEffect, useMemo, useState } from 'react';
import { KpiCorrelationPanel } from './components/KpiCorrelationPanel';
import { ResolutionPanel } from './components/ResolutionPanel';
import { ServiceOverviewCard } from './components/ServiceOverviewCard';
import { TopologyView } from './components/TopologyView';
import type { ActionType, AppState, SurfaceSchema, TimelineItem } from './types';
import './styles.css';

const labels: Record<ActionType, string> = {
  VIEW_IMPACT: 'View Impact',
  ANALYZE_KPIS: 'Analyze KPIs',
  SHOW_RCA: 'Show RCA',
  APPLY_FIX: 'Apply Fix',
};

const capabilityAnnouncement = [
  'ServiceOverviewCard',
  'TopologyView (TopologyVisualization)',
  'KpiCorrelationPanel',
  'RcaPanel',
  'ResolutionPanel'
];

const API = 'http://localhost:8787';

export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [appState, setAppState] = useState<AppState>({});
  const [surface, setSurface] = useState<SurfaceSchema | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<ActionType[]>([]);

  useEffect(() => {
    async function start() {
      setTimeline((prev) => [
        ...prev,
        {
          kind: 'user',
          text: `UI capability handshake: ${capabilityAnnouncement.join(', ')}`,
          badge: 'UI → Agent'
        }
      ]);

      const res = await fetch(`${API}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            selectedService: 'enterprise-surveillance-slice',
            regionScope: 'west-metro'
          },
          uiCapabilities: ['ServiceOverviewCard', 'TopologyView', 'KpiCorrelationPanel', 'RcaPanel', 'ResolutionPanel']
        })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setAppState(data.initialState);
    }
    start().catch(console.error);
  }, []);

  useEffect(() => {
    const entities = appState.entities;
    const alarms = appState.alarms;
    if (!entities || !alarms) return;
    setTimeline((prev) => {
      const hasContextCard = prev.some((item) => item.badge === 'Visible context');
      if (hasContextCard) return prev;
      return [
        ...prev,
        {
          kind: 'event',
          text: `Context loaded: Slice ${entities.slice} in ${entities.region}. Active alarm ${alarms[0]?.id}.`,
          badge: 'Visible context'
        }
      ];
    });
  }, [appState]);

  useEffect(() => {
    if (!sessionId) return;
    const source = new EventSource(`${API}/api/events?sessionId=${sessionId}`);

    source.addEventListener('agent.message.delta', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'agent', text: data.message, badge: data.badge || 'Thinking' }]);
    });

    source.addEventListener('agent.message.completed', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'agent', text: data.message, badge: data.badge || 'Agent event' }]);
    });

    source.addEventListener('incident.detected', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `${data.symptom} (${data.impactedEndpoints} impacted)`, badge: 'Incident' }]);
    });

    source.addEventListener('tool.invocation.requested', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `Tool requested: ${data.tool}`, badge: data.badge || 'Tool' }]);
    });

    source.addEventListener('tool.invocation.completed', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `Tool completed: ${data.tool} (${data.status})`, badge: data.badge || 'Tool' }]);
    });

    source.addEventListener('ui.surface.replace', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setSurface(data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `UI surface updated: ${data.title}`, badge: data.badge || 'UI update' }]);
    });

    source.addEventListener('rca.identified', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `RCA identified: ${data.cause} (${Math.round(data.confidence * 100)}% confidence)`, badge: data.badge || 'RCA' }]);
    });

    source.addEventListener('remediation.proposed', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `Remediation proposed: ${data.action}`, badge: data.badge || 'Remediation' }]);
    });

    source.addEventListener('remediation.completed', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setTimeline((prev) => [...prev, { kind: 'event', text: `${data.result} (${data.recoveredEndpoints} endpoints recovered)`, badge: data.badge || 'Remediation' }]);
    });

    source.addEventListener('ui.action.suggested', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setSuggestedActions(data.actions);
    });

    return () => source.close();
  }, [sessionId]);

  async function sendAction(action: ActionType) {
    if (!sessionId) return;
    setTimeline((prev) => [...prev, { kind: 'user', text: labels[action], badge: 'Operator action' }]);
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
      return (
        <ServiceOverviewCard
          title={surface.title}
          serviceName={appState.service.name}
          metrics={(surface.props as any).metrics}
          sparkline={(surface.props as any).sparkline}
          temporalSeries={(surface.props as any).temporalSeries}
        />
      );
    }
    if (surface.component === 'TopologyView') {
      return (
        <TopologyView
          title={surface.title}
          mode={(surface.props as any).mode}
          nodes={(surface.props as any).nodes}
          edges={(surface.props as any).edges}
          blastRadius={(surface.props as any).blastRadius}
          rcaDetails={(surface.props as any).rcaDetails}
        />
      );
    }
    if (surface.component === 'KpiCorrelationPanel') {
      return (
        <KpiCorrelationPanel
          title={surface.title}
          series={(surface.props as any).series}
          insight={(surface.props as any).insight}
          timestamps={(surface.props as any).timestamps}
        />
      );
    }
    return <ResolutionPanel title={surface.title} beforeAfter={(surface.props as any).beforeAfter} recoveredDevices={(surface.props as any).recoveredDevices} timeline={(surface.props as any).timeline} recoverySeries={(surface.props as any).recoverySeries} recoveryLabels={(surface.props as any).recoveryLabels} />;
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
        <section className="panel work-panel">{renderedSurface}</section>

        <aside className="panel timeline-panel">
          <h2>Chat / Agent Timeline</h2>
          <div className="timeline-scroll">
            {timeline.map((item, idx) => (
              <div className={`timeline-item ${item.kind}`} key={`${item.kind}-${idx}`}>
                <p>{item.text}</p>
                {item.badge ? <small>{item.badge}</small> : null}
              </div>
            ))}
          </div>
          <div className="timeline-actions">
            <h4>Recommended actions</h4>
            <div className="actions">
              {suggestedActions.map((action) => (
                <button key={action} onClick={() => sendAction(action)}>
                  {labels[action]}
                </button>
              ))}
              {suggestedActions.length === 0 ? <p className="empty-actions">Waiting for the agent to suggest actions...</p> : null}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
