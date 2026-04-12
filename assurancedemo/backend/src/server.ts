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

function scriptedInitialEvents(sessionId: string): void {
  queueEvent(sessionId, { type: 'session.started', payload: { sessionId, protocol: 'AG-UI-style event stream v0.1' } });
  queueEvent(sessionId, {
    type: 'incident.detected',
    payload: {
      service: baseState.service.name,
      symptom: 'Latency spike and SLA degradation',
      impactedEndpoints: baseState.service.impactedEndpoints
    }
  });
  queueEvent(sessionId, {
    type: 'agent.message.delta',
    payload: {
      message: 'Agent runtime loaded scenario and is composing the initial assurance workspace.'
    }
  });
  queueEvent(sessionId, {
    type: 'ui.surface.replace',
    payload: {
      schema: 'A2UI-style UI schema v0.1',
      ...surfaces.serviceOverview
    }
  });
  queueEvent(sessionId, {
    type: 'agent.message.completed',
    payload: {
      message: 'Latency degradation detected in Enterprise Surveillance Slice. I have prepared impact analysis.',
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

function handleAction(sessionId: string, action: DemoAction): void {
  if (action === 'RESET_DEMO') {
    sessions.set(sessionId, { id: sessionId, step: 0, queue: [] });
    scriptedInitialEvents(sessionId);
    return;
  }

  if (action === 'VIEW_IMPACT') {
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Switching to impact topology and highlighting blast radius...' }
    });
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.impactTopology } });
    queueEvent(sessionId, {
      type: 'state.patch',
      payload: { mode: 'impact', highlightedNodes: baseState.entities.impactedGnbs }
    });
    return;
  }

  if (action === 'ANALYZE_KPIS') {
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Correlating PRB utilization, handover failures, and latency trend windows...' }
    });
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.kpiCorrelation } });
    queueEvent(sessionId, {
      type: 'agent.message.completed',
      payload: { message: 'Anomalies are correlated. Elevated PRB and handover failures align with the latency spike.', badge: 'UI update' }
    });
    return;
  }

  if (action === 'SHOW_RCA') {
    queueEvent(sessionId, {
      type: 'rca.identified',
      payload: { cause: 'transport congestion affecting downstream gNBs and cells', confidence: 0.91, badge: 'RCA found' }
    });
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.rca } });
    return;
  }

  if (action === 'APPLY_FIX') {
    queueEvent(sessionId, {
      type: 'remediation.proposed',
      payload: { action: 'Reroute traffic to a secondary path', expectedLatencyGainMs: 72 }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.requested',
      payload: { tool: 'traffic-controller.reroute', args: { from: 'transport-link-a', to: 'secondary-path-b' } }
    });
    queueEvent(sessionId, {
      type: 'agent.message.delta',
      payload: { message: 'Applying reroute and validating downstream KPI stabilization...' }
    });
    queueEvent(sessionId, {
      type: 'tool.invocation.completed',
      payload: { tool: 'traffic-controller.reroute', status: 'success' }
    });
    queueEvent(sessionId, {
      type: 'remediation.completed',
      payload: { result: 'Traffic rerouted. KPIs normalized.', recoveredEndpoints: 1200 }
    });
    queueEvent(sessionId, { type: 'ui.surface.replace', payload: { schema: 'A2UI-style UI schema v0.1', ...surfaces.resolution } });
  }
}

app.post('/api/session/start', (req, res) => {
  const { context, uiCapabilities } = req.body as {
    context?: Record<string, unknown>;
    uiCapabilities?: string[];
  };
  const sessionId = `sess-${Date.now()}`;
  sessions.set(sessionId, { id: sessionId, step: 0, queue: [], context, uiCapabilities });
  scriptedInitialEvents(sessionId);
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

  handleAction(sessionId, action);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'assurancedemo-backend' });
});

const port = 8787;
app.listen(port, () => {
  console.log(`Mock agent runtime listening on http://localhost:${port}`);
});
