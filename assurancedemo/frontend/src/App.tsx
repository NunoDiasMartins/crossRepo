import { useEffect, useMemo, useRef, useState } from 'react';
import { KpiCorrelationPanel } from './components/KpiCorrelationPanel';
import { RcaPanel } from './components/RcaPanel';
import { ResolutionPanel } from './components/ResolutionPanel';
import { ServiceOverviewCard } from './components/ServiceOverviewCard';
import { TopologyView } from './components/TopologyView';
import type { ActionType, AppState, SurfaceSchema, TimelineItem } from './types';
import './styles.css';

const labels: Record<ActionType, string> = {
  VIEW_IMPACT: 'View Impact',
  ANALYZE_KPIS: 'Analyze KPIs',
  SHOW_RCA: 'Show RCA',
  APPLY_FIX: 'Apply Fix'
};

const capabilityAnnouncement = [
  'ServiceOverviewCard',
  'TopologyView (TopologyVisualization)',
  'KpiCorrelationPanel',
  'RcaPanel',
  'ResolutionPanel'
];

const API = 'http://localhost:8787';
type TopLevelPage = 'dashboard' | 'kpis' | 'topology';
type SessionStartResponse = {
  sessionId: string;
  initialState: AppState;
};

type ComposedView = 'topology' | 'rca' | 'kpis';

let sessionStartPromise: Promise<SessionStartResponse> | null = null;
let hasLoggedCapabilityAnnouncement = false;

const DEFAULT_KPI_TIMESTAMPS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];

const DEFAULT_KPI_SERIES = {
  serviceAvailability: [99.98, 99.97, 99.94, 99.9, 99.82, 99.76, 99.71],
  latencyP95: [44, 46, 48, 62, 89, 122, 148],
  throughputDlUl: [421, 416, 403, 378, 342, 321, 309],
  sessionSuccessRate: [99.4, 99.3, 99.2, 98.8, 98.1, 97.2, 96.8],
  dropRate: [0.2, 0.3, 0.4, 0.9, 1.6, 2.4, 3.1],
  prbUtilization: [62, 64, 66, 74, 81, 88, 91],
  handoverSuccessRate: [99.1, 99.0, 98.8, 98.1, 97.3, 96.4, 95.9],
  sliceSlaCompliance: [99.8, 99.7, 99.6, 99.1, 98.7, 98.2, 97.8],
  packetLoss: [0.1, 0.2, 0.3, 0.8, 1.1, 1.7, 2.2],
  alarmCorrelationCount: [2, 3, 3, 5, 8, 11, 14]
};

type KpiSeriesKey = keyof typeof DEFAULT_KPI_SERIES;

const DEFAULT_TOPOLOGY_NODES = [
  { id: 'transport-link-a', label: 'transport-link-a', type: 'transport', impacted: true },
  { id: 'gnb-101', label: 'gnb-101', type: 'gnb', impacted: true },
  { id: 'gnb-102', label: 'gnb-102', type: 'gnb', impacted: true },
  { id: 'gnb-103', label: 'gnb-103', type: 'gnb', impacted: true },
  { id: 'cell-101-a', label: 'cell-101-a', type: 'cell', impacted: true },
  { id: 'cell-101-b', label: 'cell-101-b', type: 'cell', impacted: true },
  { id: 'cell-102-a', label: 'cell-102-a', type: 'cell', impacted: true },
  { id: 'cell-103-a', label: 'cell-103-a', type: 'cell', impacted: true }
];

const DEFAULT_TOPOLOGY_EDGES: string[][] = [
  ['transport-link-a', 'gnb-101'],
  ['transport-link-a', 'gnb-102'],
  ['transport-link-a', 'gnb-103'],
  ['gnb-101', 'cell-101-a'],
  ['gnb-101', 'cell-101-b'],
  ['gnb-102', 'cell-102-a'],
  ['gnb-103', 'cell-103-a']
];

const DEFAULT_RCA_TREE = {
  node: 'transport-link-a congestion',
  children: [
    {
      node: 'Queue depth saturation',
      children: [{ node: 'Burst traffic from surveillance uplink' }, { node: 'Shaping policy threshold exceeded' }]
    },
    {
      node: 'Impacted downstream elements',
      children: [{ node: 'gnb-101' }, { node: 'gnb-102' }, { node: 'gnb-103' }]
    }
  ]
};

const KPI_ALIASES: Record<string, KpiSeriesKey> = {
  'drop rate': 'dropRate',
  droprate: 'dropRate',
  'packet loss': 'packetLoss',
  packetloss: 'packetLoss',
  latency: 'latencyP95',
  jitter: 'latencyP95',
  throughput: 'throughputDlUl',
  'retransmission rate': 'alarmCorrelationCount',
  'call setup success rate': 'sessionSuccessRate',
  'handover failure rate': 'handoverSuccessRate'
};

export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [appState, setAppState] = useState<AppState>({});
  const [surface, setSurface] = useState<SurfaceSchema | null>(null);
  const [activePage, setActivePage] = useState<TopLevelPage>('dashboard');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<ActionType[]>([]);
  const [operatorInput, setOperatorInput] = useState('');
  const [composedViews, setComposedViews] = useState<ComposedView[]>([]);
  const [selectedKpiKeys, setSelectedKpiKeys] = useState<KpiSeriesKey[]>([]);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function start() {
      if (!hasLoggedCapabilityAnnouncement) {
        hasLoggedCapabilityAnnouncement = true;
        setTimeline((prev) => [
          ...prev,
          {
            kind: 'user',
            text: `UI capability handshake: ${capabilityAnnouncement.join(', ')}`,
            badge: 'UI → Agent'
          }
        ]);
      }

      sessionStartPromise ??= fetch(`${API}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            selectedService: 'enterprise-surveillance-slice',
            regionScope: 'west-metro'
          },
          uiCapabilities: ['ServiceOverviewCard', 'TopologyView', 'KpiCorrelationPanel', 'RcaPanel', 'ResolutionPanel']
        })
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Session start failed with status ${res.status}`);
        }

        return (await res.json()) as SessionStartResponse;
      });

      const data = await sessionStartPromise;
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
      setComposedViews([]);
      setSelectedKpiKeys([]);
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

  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [timeline]);

  async function sendAction(action: ActionType) {
    if (!sessionId) return;
    setComposedViews([]);
    setSelectedKpiKeys([]);
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

  function resolveActionFromText(input: string): ActionType | null {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return null;

    const directMatch = (Object.entries(labels) as [ActionType, string][])
      .find(([, label]) => label.toLowerCase() === normalized)?.[0];
    if (directMatch) return directMatch;

    const suggestedMatch = suggestedActions.find((action) => labels[action].toLowerCase() === normalized);
    if (suggestedMatch) return suggestedMatch;

    return null;
  }

  function parseComposedViews(input: string): { views: ComposedView[]; kpiKeys: KpiSeriesKey[] } | null {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return null;

    const views: ComposedView[] = [];
    const mentionsRca = normalized.includes('rca') || normalized.includes('root cause');
    const mentionsTopology = normalized.includes('impact topology');
    const mentionsKpi = normalized.includes('kpi');

    if (mentionsTopology) views.push('topology');
    if (mentionsRca) views.push('rca');
    if (mentionsKpi) views.push('kpis');

    if (views.length < 2) return null;

    const matchedKpis = Object.entries(KPI_ALIASES)
      .filter(([alias]) => normalized.includes(alias))
      .map(([, key]) => key);

    const uniqueKpis = Array.from(new Set(matchedKpis));
    return { views, kpiKeys: uniqueKpis };
  }

  async function submitOperatorInput() {
    const trimmedInput = operatorInput.trim();
    if (!trimmedInput) return;

    const matchedAction = resolveActionFromText(trimmedInput);
    if (matchedAction) {
      setOperatorInput('');
      await sendAction(matchedAction);
      return;
    }

    const composedIntent = parseComposedViews(trimmedInput);
    if (composedIntent) {
      setComposedViews(composedIntent.views);
      setSelectedKpiKeys(composedIntent.kpiKeys);
      setTimeline((prev) => [
        ...prev,
        {
          kind: 'event',
          text: `Composed surface request detected: ${composedIntent.views.join(' + ')}${composedIntent.kpiKeys.length ? ` (${composedIntent.kpiKeys.join(', ')})` : ''}`,
          badge: 'UI compose'
        }
      ]);
    }

    setTimeline((prev) => [...prev, { kind: 'user', text: trimmedInput, badge: 'Operator note' }]);
    setOperatorInput('');
  }

  function renderSurfaceSchema(currentSurface: SurfaceSchema) {
    if (!appState.service) return null;

    if (currentSurface.component === 'ServiceOverviewCard') {
      return (
        <ServiceOverviewCard
          title={currentSurface.title}
          serviceName={appState.service.name}
          metrics={(currentSurface.props as any).metrics}
          sparkline={(currentSurface.props as any).sparkline}
          temporalSeries={(currentSurface.props as any).temporalSeries}
        />
      );
    }

    if (currentSurface.component === 'TopologyView') {
      return (
        <TopologyView
          title={currentSurface.title}
          mode={(currentSurface.props as any).mode}
          nodes={(currentSurface.props as any).nodes}
          edges={(currentSurface.props as any).edges}
          blastRadius={(currentSurface.props as any).blastRadius}
          rcaDetails={(currentSurface.props as any).rcaDetails}
        />
      );
    }

    if (currentSurface.component === 'KpiCorrelationPanel') {
      return (
        <KpiCorrelationPanel
          title={currentSurface.title}
          series={(currentSurface.props as any).series}
          insight={(currentSurface.props as any).insight}
          timestamps={(currentSurface.props as any).timestamps}
        />
      );
    }

    if (currentSurface.component === 'RcaPanel') {
      return (
        <RcaPanel
          title={currentSurface.title}
          confidence={(currentSurface.props as any).confidence}
          rootCause={(currentSurface.props as any).rootCause}
          tree={(currentSurface.props as any).tree}
          propagation={(currentSurface.props as any).propagation}
        />
      );
    }

    return (
      <ResolutionPanel
        title={currentSurface.title}
        beforeAfter={(currentSurface.props as any).beforeAfter}
        recoveredDevices={(currentSurface.props as any).recoveredDevices}
        timeline={(currentSurface.props as any).timeline}
        recoverySeries={(currentSurface.props as any).recoverySeries}
        recoveryLabels={(currentSurface.props as any).recoveryLabels}
      />
    );
  }

  const renderedSurface = useMemo(() => {
    if (!surface || !appState.service) return <div className="empty-surface">Awaiting agent-composed UI surface...</div>;
    return renderSurfaceSchema(surface);
  }, [surface, appState]);

  const renderedComposedSurface = useMemo(() => {
    if (!composedViews.length) return null;

    return (
      <div className="composed-surface-stack">
        {composedViews.includes('topology') ? (
          <TopologyView
            title="Impact Topology"
            mode="impact"
            nodes={DEFAULT_TOPOLOGY_NODES}
            edges={DEFAULT_TOPOLOGY_EDGES}
            blastRadius={{
              impactedCameras: 1200,
              impactedGnbs: 3,
              impactedCells: 4
            }}
          />
        ) : null}

        {composedViews.includes('rca') ? (
          <RcaPanel
            title="Root Cause Analysis"
            confidence={0.92}
            rootCause="Transport congestion on transport-link-a"
            tree={DEFAULT_RCA_TREE}
            propagation="Congestion propagates across the west-metro path, increasing packet handling delays in impacted gNB clusters."
          />
        ) : null}

        {composedViews.includes('kpis') ? (
          <KpiCorrelationPanel
            title={selectedKpiKeys.length ? 'Requested KPI Correlation' : 'KPI Correlation'}
            series={DEFAULT_KPI_SERIES}
            insight="Requested KPIs are rendered with RCA/topology to support side-by-side triage."
            timestamps={DEFAULT_KPI_TIMESTAMPS}
            metricKeys={selectedKpiKeys}
          />
        ) : null}
      </div>
    );
  }, [composedViews, selectedKpiKeys]);

  const renderedKpiPage = useMemo(() => {
    const isLiveKpiSurface = surface?.component === 'KpiCorrelationPanel';
    const kpiProps = isLiveKpiSurface ? (surface?.props as any) : null;

    return (
      <KpiCorrelationPanel
        title={isLiveKpiSurface ? surface.title : 'All Service KPIs'}
        series={kpiProps?.series ?? DEFAULT_KPI_SERIES}
        insight={
          kpiProps?.insight ??
          'Drop rate and packet loss move with latency spikes, indicating transport congestion impact across the slice.'
        }
        timestamps={kpiProps?.timestamps ?? DEFAULT_KPI_TIMESTAMPS}
      />
    );
  }, [surface]);

  const renderedTopologyPage = useMemo(() => {
    const isLiveTopologySurface = surface?.component === 'TopologyView';
    const topologyProps = isLiveTopologySurface ? (surface?.props as any) : null;

    return (
      <TopologyView
        title={isLiveTopologySurface ? surface.title : 'Network Topology'}
        mode={topologyProps?.mode ?? 'impact'}
        nodes={topologyProps?.nodes ?? DEFAULT_TOPOLOGY_NODES}
        edges={topologyProps?.edges ?? DEFAULT_TOPOLOGY_EDGES}
        blastRadius={
          topologyProps?.blastRadius ?? {
            impactedCameras: 1200,
            impactedGnbs: 3,
            impactedCells: 4
          }
        }
        rcaDetails={topologyProps?.rcaDetails}
      />
    );
  }, [surface]);

  return (
    <div className="app-shell">
      <header>
        <h1>Agent-First Assurance Demo</h1>
        <span className="badge">Mock EDC Demo</span>
        <nav className="top-nav" aria-label="Top-level navigation">
          <button className={activePage === 'dashboard' ? 'active' : ''} onClick={() => setActivePage('dashboard')}>
            Service Dashboard
          </button>
          <button className={activePage === 'kpis' ? 'active' : ''} onClick={() => setActivePage('kpis')}>
            KPI List
          </button>
          <button className={activePage === 'topology' ? 'active' : ''} onClick={() => setActivePage('topology')}>
            Topology View
          </button>
        </nav>
        <select value={appState.service?.id}>
          <option value="enterprise-surveillance-slice">Enterprise Surveillance Slice</option>
        </select>
      </header>
      {activePage === 'dashboard' ? (
        <main>
          <section className="panel work-panel">{renderedComposedSurface ?? renderedSurface}</section>

          <aside className="panel timeline-panel">
            <h2>Chat / Agent Timeline</h2>
            <div className="timeline-scroll" ref={timelineScrollRef}>
              {timeline.map((item, idx) => (
                <div className={`timeline-item ${item.kind}`} key={`${item.kind}-${idx}`}>
                  <p>{item.text}</p>
                  {item.badge ? <small>{item.badge}</small> : null}
                </div>
              ))}
            </div>
            <div className="timeline-actions">
              <h4>Operator input</h4>
              <div className="operator-input">
                <textarea
                  value={operatorInput}
                  onChange={(evt) => setOperatorInput(evt.target.value)}
                  onKeyDown={(evt) => {
                    if (evt.key !== 'Enter' || evt.shiftKey) return;
                    evt.preventDefault();
                    void submitOperatorInput();
                  }}
                  placeholder="Write an action or note. Suggested actions appear below."
                  rows={3}
                />
                <button onClick={submitOperatorInput} disabled={!operatorInput.trim()}>
                  Send
                </button>
              </div>
              <div className="action-suggestions">
                {suggestedActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => setOperatorInput(labels[action])}
                  >
                    {labels[action]}
                  </button>
                ))}
                {suggestedActions.length === 0 ? <p className="empty-actions">Waiting for the agent to suggest actions...</p> : null}
              </div>
            </div>
          </aside>
        </main>
      ) : (
        <main className="single-page-main">
          <section className="panel work-panel">{activePage === 'kpis' ? renderedKpiPage : renderedTopologyPage}</section>
        </main>
      )}
    </div>
  );
}
