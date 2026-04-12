import cors from 'cors';
import express from 'express';
import { baseState, surfaces } from './data/mockData.js';

type DemoAction = 'VIEW_IMPACT' | 'ANALYZE_KPIS' | 'SHOW_RCA' | 'APPLY_FIX' | 'RESET_DEMO';

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

const ACTION_SUGGESTIONS: Record<DemoAction, DemoAction[]> = {
  VIEW_IMPACT: ['ANALYZE_KPIS', 'SHOW_RCA', 'APPLY_FIX', 'RESET_DEMO'],
  ANALYZE_KPIS: ['SHOW_RCA', 'APPLY_FIX', 'RESET_DEMO'],
  SHOW_RCA: ['APPLY_FIX', 'RESET_DEMO'],
  APPLY_FIX: ['RESET_DEMO'],
  RESET_DEMO: ['VIEW_IMPACT', 'ANALYZE_KPIS', 'SHOW_RCA', 'APPLY_FIX', 'RESET_DEMO']
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
      actions: ['VIEW_IMPACT', 'ANALYZE_KPIS', 'SHOW_RCA', 'APPLY_FIX', 'RESET_DEMO']
    }
  });
}

async function handleAction(sessionId: string, action: DemoAction): Promise<void> {
  if (action === 'RESET_DEMO') {
    sessions.set(sessionId, { id: sessionId, step: 0, queue: [], context: sessions.get(sessionId)?.context, uiCapabilities: sessions.get(sessionId)?.uiCapabilities });
    await scriptedInitialEvents(sessionId);
    return;
  }

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
      actions: ACTION_SUGGESTIONS[action]
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'assurancedemo-backend' });
});

const port = 8787;
app.listen(port, () => {
  console.log(`Mock agent runtime listening on http://localhost:${port}`);
});
