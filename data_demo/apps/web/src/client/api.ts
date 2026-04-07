import type { UIInteractionEvent } from '@demo/shared';

const API_BASE = 'http://localhost:8787/api/agent';

export const startRun = async (sessionId: string, prompt: string): Promise<void> => {
  await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, prompt })
  });
};

export const sendAction = async (sessionId: string, uiEvent: UIInteractionEvent): Promise<void> => {
  await fetch(`${API_BASE}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, uiEvent })
  });
};

export const openEventStream = (sessionId: string): EventSource => {
  return new EventSource(`${API_BASE}/stream/${sessionId}`);
};
