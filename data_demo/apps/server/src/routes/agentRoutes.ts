import { Router } from 'express';
import { BackendAnalyticsAgent } from '../agent/runtimeAgent.js';
import { sseHub } from '../streaming/sseHub.js';
import { sessionStore } from '../state/sessionStore.js';
import { ScenarioEvents, type AgentEvent, type UIInteractionEvent } from '@demo/shared';

const router = Router();
const agent = new BackendAnalyticsAgent({ agentId: 'backend-analytics-agent' } as never);

router.get('/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const clientId = crypto.randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId, clientId })}\n\n`);
  sseHub.subscribe(sessionId, { id: clientId, res });

  req.on('close', () => {
    sseHub.unsubscribe(sessionId, clientId);
  });
});

router.post('/run', (req, res) => {
  const { prompt, sessionId } = req.body as { prompt: string; sessionId: string };
  const runId = crypto.randomUUID();

  const run = agent.run({ runId, context: { sessionId, prompt } as never } as never);
  run().subscribe({
    next: (event: AgentEvent) => {
      sessionStore.appendEvent(sessionId, event);
      if (event.type === ScenarioEvents.STATE_UPDATED && event.data) {
        sessionStore.updateState(sessionId, runId, (event.data as { state: never }).state as never);
      }
      sseHub.publish(sessionId, event);
    }
  });

  res.json({ ok: true, runId });
});

router.post('/action', (req, res) => {
  const { sessionId, uiEvent } = req.body as { sessionId: string; uiEvent: UIInteractionEvent };

  if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'replay') {
    sessionStore.getReplay(sessionId).forEach((event) => {
      sseHub.publish(sessionId, { ...event, type: `replay.ready.${event.type}` });
    });
    res.json({ ok: true, replay: true });
    return;
  }

  if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'undo') {
    const replay = sessionStore.getReplay(sessionId);
    const previousStateEvent = [...replay].reverse().find((event) => event.type === ScenarioEvents.STATE_UPDATED);
    if (previousStateEvent) {
      sseHub.publish(sessionId, { ...previousStateEvent, type: 'undo.applied' });
    }
    res.json({ ok: true, undo: true });
    return;
  }

  const runId = crypto.randomUUID();
  const run = agent.run({ runId, context: { sessionId, uiEvent } as never } as never);

  run().subscribe({
    next: (event: AgentEvent) => {
      sessionStore.appendEvent(sessionId, event);
      if (event.type === ScenarioEvents.STATE_UPDATED && event.data) {
        sessionStore.updateState(sessionId, runId, (event.data as { state: never }).state as never);
      }
      sseHub.publish(sessionId, event);
    }
  });

  res.json({ ok: true, runId });
});

export default router;
