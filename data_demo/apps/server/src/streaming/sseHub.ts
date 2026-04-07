import type { Response } from 'express';
import type { AgentEvent } from '@demo/shared';

type Client = {
  id: string;
  res: Response;
};

class SSEHub {
  private clients = new Map<string, Client[]>();

  subscribe(sessionId: string, client: Client): void {
    const existing = this.clients.get(sessionId) ?? [];
    existing.push(client);
    this.clients.set(sessionId, existing);
  }

  unsubscribe(sessionId: string, clientId: string): void {
    const existing = this.clients.get(sessionId) ?? [];
    this.clients.set(sessionId, existing.filter((client) => client.id !== clientId));
  }

  publish(sessionId: string, event: AgentEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    (this.clients.get(sessionId) ?? []).forEach((client) => client.res.write(payload));
  }
}

export const sseHub = new SSEHub();
