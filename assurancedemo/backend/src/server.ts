import cors from 'cors';
import express from 'express';
import { baseState, surfaces } from './data/mockData.js';

type DemoAction = 'VIEW_IMPACT' | 'ANALYZE_KPIS' | 'SHOW_RCA' | 'APPLY_FIX';
type ComposedView = 'topology' | 'rca' | 'kpis' | 'resolution';
type KpiSeriesKey =
  | 'serviceAvailability'
  | 'latencyP95'
  | 'throughputDlUl'
  | 'sessionSuccessRate'
  | 'dropRate'
  | 'prbUtilization'
  | 'handoverSuccessRate'
  | 'sliceSlaCompliance'
  | 'packetLoss'
  | 'alarmCorrelationCount';

type DemoEvent = {
  type:
    | 'session.started'
    | 'agent.message.delta'
    | 'agent.message.completed'
    | 'state.patch'
    | 'ui.surface.replace'
    | 'ui.surface.patch'
    | 'ui.action.suggested'
    | 'tool.invocation.requested'
    | 'tool.invocation.completed'
    | 'incident.detected'
    | 'rca.identified'
    | 'remediation.proposed'
    | 'remediation.completed';
  payload: Record<string, unknown>;
};

type Session = {
  id: string;
  step: number;
  queue: DemoEvent[];
  context?: Record<string, unknown>;
  uiCapabilities?: string[];
};

const app = express();
app.use(cors());
app.use(express.json());

const sessions = new Map<string, Session>();
const clients = new Map<string, express.Response[]>();

const RECOMMENDATION_FLOW: Record<'INITIAL' | DemoAction, DemoAction[]> = {
  INITIAL: ['VIEW_IMPACT'],
  VIEW_IMPACT: ['ANALYZE_KPIS'],
  ANALYZE_KPIS: ['SHOW_RCA'],
  SHOW_RCA: ['APPLY_FIX'],
  APPLY_FIX: ['ANALYZE_KPIS']
};

const EXTRA_ACTION_POOLS: Record<'INITIAL' | DemoAction, DemoAction[]> = {
  INITIAL: ['ANALYZE_KPIS', 'SHOW_RCA'],
  VIEW_IMPACT: ['SHOW_RCA', 'APPLY_FIX'],
  ANALYZE_KPIS: ['VIEW_IMPACT', 'APPLY_FIX'],
  SHOW_RCA: ['VIEW_IMPACT', 'ANALYZE_KPIS'],
  APPLY_FIX: ['VIEW_IMPACT', 'SHOW_RCA']
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueEvent(sessionId: string, event: DemoEvent): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.queue.push(event);
  flush(sessionId);
}

function flush(sessionId: string): void {
  const session = sessions.get(sessionId);
  const listeners = clients.get(sessionId) ?? [];
  if (!session || listeners.length === 0) return;

  while (session.queue.length > 0) {
    const event = session.queue.shift();
    if (!event) continue;
    listeners.forEach((res) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
    });
  }
}

function buildCapabilityLabels(uiCapabilities: string[] = []): string[] {
  const mapping: Record<string, string> = {
    ServiceOverviewCard: 'Service Overview Card',
    TopologyView: 'Topology Visualization',
    KpiCorrelationPanel: 'KPI Correlation Panel',
    RcaPanel: 'RCA Analysis Panel',
    ResolutionPanel: 'Resolution Summary Panel'
  };
  return uiCapabilities.map((capability) => mapping[capability] ?? capability);
}

function chooseRandomActions(actions: DemoAction[]): DemoAction[] {
  const shuffled = [...actions];
  for (let idx = shuffled.length - 1; idx > 0; idx -= 1) {
    const swapWith = Math.floor(Math.random() * (idx + 1));
    [shuffled[idx], shuffled[swapWith]] = [shuffled[swapWith], shuffled[idx]];
  }
  const maxCount = Math.min(2, shuffled.length);
  const count = Math.min(shuffled.length, Math.max(1, Math.floor(Math.random() * maxCount) + 1));
  return shuffled.slice(0, count);
}

function buildSuggestedActions(stage: 'INITIAL' | DemoAction): DemoAction[] {
  const primary = RECOMMENDATION_FLOW[stage];
  const extras = chooseRandomActions(EXTRA_ACTION_POOLS[stage]);
  return Array.from(new Set([...primary, ...extras]));
}

const actionLabels: Record<DemoAction, string> = {
  VIEW_IMPACT: 'view impact',
  ANALYZE_KPIS: 'analyze kpis',
  SHOW_RCA: 'show rca',
  APPLY_FIX: 'apply fix'
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

function resolveActionFromText(input: string): DemoAction | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const directMatch = (Object.entries(actionLabels) as [DemoAction, string][])
    .find(([, label]) => label === normalized)?.[0];

  return directMatch ?? null;
}

function parseComposedViews(input: string): { views: ComposedView[]; kpiKeys: KpiSeriesKey[] } | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const views: ComposedView[] = [];
  const mentionsRca = normalized.includes('rca') || normalized.includes('root cause');
  const mentionsTopology = normalized.includes('impact topology') || (normalized.includes('topology') && normalized.includes('impact'));
  const mentionsKpi = normalized.includes('kpi');
  const mentionsResolution = normalized.includes('resolution summary');

  if (mentionsTopology) views.push('topology');
  if (mentionsRca) views.push('rca');
  if (mentionsKpi) views.push('kpis');
  if (mentionsResolution) views.push('resolution');

  if (views.length < 2) return null;

  const matchedKpis = Object.entries(KPI_ALIASES)
    .filter(([alias]) => normalized.includes(alias))
    .map(([, key]) => key);

  return {
    views,
    kpiKeys: Array.from(new Set(matchedKpis))
  };
}

function buildComposedSurfacePayload(views: ComposedView[], kpiKeys: KpiSeriesKey[]) {
  const composedSurfaces: Array<{ title: string; component: string; props: Record<string, unknown> }> = [];

  if (views.includes('resolution')) {
    composedSurfaces.push({
      title: surfaces.resolution.title,
      component: surfaces.resolution.component,
      props: surfaces.resolution.props
    });
  }

  if (views.includes('topology')) {
    composedSurfaces.push({
      title: surfaces.impactTopology.title,
      component: surfaces.impactTopology.component,
      props: surfaces.impactTopology.props
    });
  }

  if (views.includes('rca')) {
    composedSurfaces.push({
      title: 'Root Cause Analysis',
      component: 'RcaPanel',
      props: {
        confidence: 0.92,
        rootCause: 'Transport congestion on transport-link-a',
        tree: {
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
        },
        propagation:
          'Congestion propagates across the west-metro path, increasing packet handling delays in impacted gNB clusters.'
      }
    });
  }

  if (views.includes('kpis')) {
    composedSurfaces.push({
      title: kpiKeys.length ? 'Requested KPI Correlation' : surfaces.kpiCorrelation.title,
      component: surfaces.kpiCorrelation.component,
      props: {
        ...surfaces.kpiCorrelation.props,
        insight: 'Requested KPIs are rendered with RCA/topology to support side-by-side triage.',
        metricKeys: kpiKeys
      }
    });
  }

  return {
    schema: 'A2UI-style UI schema v0.1',
    surface: 'composed-stack',
    title: 'Composed Investigation View',
    component: 'ComposedSurfaceStack',
    props: { composedSurfaces },
    badge: 'Surface composed'
  };
}

async function scriptedInitialEvents(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  const capabilities = buildCapabilityLabels(session?.uiCapabilities);

  queueEvent(sessionId, { type: 'session.started', payload: { sessionId, protocol: 'AG-UI-style event stream v0.1' } });
  queueEvent(sessionId, {
    type: 'incident.detected',
    payload: {
      service: baseState.service.name,
      symptom: 'Latency spike and SLA degradation',
      impactedEndpoints: baseState.service.impactedEndpoints,
      badge: 'Incident'
    }
  });
  queueEvent(sessionId, {
    type: 'agent.message.delta',
    payload: {
      message: 'Acknowledged UI capability handshake. Planning the first surface now...',
      badge: 'Thinking'
    }
  });
  await sleep(500);
  queueEvent(sessionId, {
    type: 'agent.message.completed',
    payload: {
      message: `Capabilities available: ${capabilities.join(', ')}. I will select these tools as the investigation progresses.`,
      badge: 'Capability handshake'
    }
  });
  await sleep(450);
  queueEvent(sessionId, {
    type: 'ui.surface.replace',
    payload: {
      schema: 'A2UI-style UI schema v0.1',
      ...surfaces.serviceOverview,
      badge: 'Surface composed'
    }
  });
  queueEvent(sessionId, {
    type: 'agent.message.completed',
    payload: {
      message: 'Latency degradation detected in Enterprise Surveillance Slice. Recommended next step: inspect impact topology.',
      badge: 'Agent event'
    }
  });
  queueEvent(sessionId, {
    type: 'ui.action.suggested',
    payload: {
      actions: buildSuggestedActions('INITIAL')
    }
  });
}

async function handleAction(sessionId: string, action: DemoAction): Promise<void> {
  if (action === 'VIEW_IMPACT') {
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Thinking: computing blast radius and selecting Topology Visualization...', badge: 'Thinking' }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.requested',
      payload: { tool: 'TopologyVisualization.impactGraph', badge: 'Tool requested' }
    });
    await sleep(700);
    queueEvent(sessionId, {
      type: 'tool.invocation.completed',
      payload: { tool: 'TopologyVisualization.impactGraph', status: 'success', badge: 'Tool completed' }
    });
    await sleep(350);
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.impactTopology, badge: 'Surface composed' } });
    queueEvent(sessionId, {
      type: 'state.patch',
      payload: { mode: 'impact', highlightedNodes: baseState.entities.impactedGnbs }
    });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: { message: 'Impact topology ready. Three gNBs and four cells are in the blast radius.', badge: 'Agent event' }
    });
  }

  if (action === 'ANALYZE_KPIS') {
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Thinking: correlating PRB utilization, handover failures, and latency windows...', badge: 'Thinking' }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.requested',
      payload: { tool: 'KpiCorrelationPanel.timeseriesAnalyzer', badge: 'Tool requested' }
    });
    await sleep(650);
    queueEvent(sessionId, {
      type: 'tool.invocation.completed',
      payload: { tool: 'KpiCorrelationPanel.timeseriesAnalyzer', status: 'success', badge: 'Tool completed' }
    });
    await sleep(300);
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.kpiCorrelation, badge: 'Surface composed' } });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: { message: 'Anomalies are correlated. Elevated PRB and handover failures align with the latency spike.', badge: 'Agent event' }
    });
  }

  if (action === 'SHOW_RCA') {
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Thinking: tracing causal propagation to identify the root transport fault...', badge: 'Thinking' }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.requested',
      payload: { tool: 'TopologyVisualization.causalPath', badge: 'Tool requested' }
    });
    await sleep(800);
    queueEvent(sessionId, {
      type: 'tool.invocation.completed',
      payload: { tool: 'TopologyVisualization.causalPath', status: 'success', badge: 'Tool completed' }
    });
    queueEvent(sessionId, {
      type: 'rca.identified',
      payload: { cause: 'transport congestion affecting downstream gNBs and cells', confidence: 0.91, badge: 'RCA found' }
    });
    await sleep(300);
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.rca, badge: 'Surface composed' } });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: { message: 'RCA complete. Root cause is transport-link-a congestion, with clear downstream propagation.', badge: 'Agent event' }
    });
  }

  if (action === 'APPLY_FIX') {
    queueEvent(sessionId, {
      type: 'remediation.proposed',
      payload: { action: 'Reroute traffic to a secondary path', expectedLatencyGainMs: 72, badge: 'Remediation' }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.requested',
      payload: { tool: 'traffic-controller.reroute', args: { from: 'transport-link-a', to: 'secondary-path-b' }, badge: 'Tool requested' }
    });
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Applying reroute and validating downstream KPI stabilization...', badge: 'Thinking' }
    });
    await sleep(900);
    queueEvent(sessionId, {
      type: 'tool.invocation.completed',
      payload: { tool: 'traffic-controller.reroute', status: 'success', badge: 'Tool completed' }
    });
    await sleep(300);
    queueEvent(sessionId, {
      type: 'remediation.completed',
      payload: { result: 'Traffic rerouted. KPIs normalized.', recoveredEndpoints: 1200, badge: 'Remediation complete' }
    });
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.resolution, badge: 'Surface composed' } });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: { message: 'Fix applied successfully. Service has recovered and SLA is back within target.', badge: 'Agent event' }
    });
  }

  queueEvent(sessionId, {
    type: 'ui.action.suggested',
    payload: {
      actions: buildSuggestedActions(action)
    }
  });
}

app.post('/api/session/start', (req, res) => {
  const { context, uiCapabilities } = req.body as {
    context?: Record<string, unknown>;
    uiCapabilities?: string[];
  };
  const sessionId = `sess-${Date.now()}`;
  sessions.set(sessionId, { id: sessionId, step: 0, queue: [], context, uiCapabilities });
  void scriptedInitialEvents(sessionId);
  res.json({ sessionId, initialState: baseState, acceptedContext: context, acceptedUiCapabilities: uiCapabilities ?? [] });
});

app.get('/api/events', (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const existing = clients.get(sessionId) ?? [];
  clients.set(sessionId, [...existing, res]);

  flush(sessionId);

  req.on('close', () => {
    const updated = (clients.get(sessionId) ?? []).filter((client) => client !== res);
    clients.set(sessionId, updated);
  });
});

app.post('/api/action', (req, res) => {
  const { sessionId, action, stateSnapshot, visibleContext } = req.body as {
    sessionId?: string;
    action?: DemoAction;
    stateSnapshot?: Record<string, unknown>;
    visibleContext?: Record<string, unknown>;
  };
  if (!sessionId || !action || !sessions.has(sessionId)) {
    res.status(400).json({ error: 'Invalid session or action' });
    return;
  }

  queueEvent(sessionId, {
    type: 'state.patch',
    payload: {
      lastUserAction: action,
      receivedStateSnapshot: stateSnapshot ?? null,
      receivedVisibleContext: visibleContext ?? null
    }
  });

  void handleAction(sessionId, action);
  res.json({ ok: true });
});

app.post('/api/operator-input', (req, res) => {
  const { sessionId, input, stateSnapshot, visibleContext } = req.body as {
    sessionId?: string;
    input?: string;
    stateSnapshot?: Record<string, unknown>;
    visibleContext?: Record<string, unknown>;
  };

  if (!sessionId || !sessions.has(sessionId) || !input?.trim()) {
    res.status(400).json({ error: 'Invalid session or operator input' });
    return;
  }

  const normalizedInput = input.trim().toLowerCase();
  const session = sessions.get(sessionId);
  const isResolutionVisible = stateSnapshot?.currentSurface === 'resolution-summary';
  const shouldAppendTopologyToResolution =
    isResolutionVisible &&
    normalizedInput.includes('topology') &&
    (normalizedInput.includes('add') || normalizedInput.includes('include')) &&
    normalizedInput.includes('view');

  queueEvent(sessionId, {
    type: 'state.patch',
    payload: {
      lastOperatorInput: input,
      receivedStateSnapshot: stateSnapshot ?? null,
      receivedVisibleContext: visibleContext ?? null
    }
  });

  const matchedAction = resolveActionFromText(input);
  if (matchedAction) {
    if (session) {
      session.step += 1;
    }
    void handleAction(sessionId, matchedAction);
    res.json({ ok: true, routedTo: 'action', action: matchedAction });
    return;
  }

  const composedIntent = parseComposedViews(input);
  if (shouldAppendTopologyToResolution || composedIntent) {
    const views: ComposedView[] = shouldAppendTopologyToResolution
      ? ['resolution', 'topology']
      : composedIntent?.views ?? [];
    const kpiKeys = shouldAppendTopologyToResolution ? [] : composedIntent?.kpiKeys ?? [];
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: {
        message: 'Thinking: mapping your free-text request into an AG-UI composed surface...',
        badge: 'Thinking'
      }
    });
    queueEvent(sessionId, {
      type: 'ui.surface.replace',
      payload: buildComposedSurfacePayload(views, kpiKeys)
    });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: {
        message: `Composed view ready: ${views.join(' + ')}${kpiKeys.length ? ` (${kpiKeys.join(', ')})` : ''}.`,
        badge: 'Agent event'
      }
    });
    queueEvent(sessionId, {
      type: 'ui.action.suggested',
      payload: {
        actions: buildSuggestedActions((session?.step ? 'APPLY_FIX' : 'INITIAL') as 'INITIAL' | DemoAction)
      }
    });
    if (session) {
      session.step += 1;
    }
    res.json({ ok: true, routedTo: 'composed-surface', views, kpiKeys });
    return;
  }

  queueEvent(sessionId, {
    type: 'agent.message.completed',
    payload: {
      message: "I logged your note. Ask for an action (View Impact, Analyze KPIs, Show RCA, Apply Fix) or a composed view request.",
      badge: 'Agent event'
    }
  });
  res.json({ ok: true, routedTo: 'note' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'assurancedemo-backend' });
});

const port = 8787;
app.listen(port, () => {
  console.log(`Mock agent runtime listening on http://localhost:${port}`);
});
