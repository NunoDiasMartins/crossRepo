import type { AgentEvent, DemoState } from '@demo/shared';

export type SessionRecord = {
  sessionId: string;
  lastRunId?: string;
  state?: DemoState;
  eventLog: AgentEvent[];
};

class SessionStore {
  private sessions = new Map<string, SessionRecord>();

  get(sessionId: string): SessionRecord {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { sessionId, eventLog: [] });
    }

    return this.sessions.get(sessionId)!;
  }

  updateState(sessionId: string, runId: string, state: DemoState): void {
    const session = this.get(sessionId);
    session.lastRunId = runId;
    session.state = state;
  }

  appendEvent(sessionId: string, event: AgentEvent): void {
    this.get(sessionId).eventLog.push(event);
  }

  getReplay(sessionId: string): AgentEvent[] {
    return [...this.get(sessionId).eventLog];
  }
}

export const sessionStore = new SessionStore();
