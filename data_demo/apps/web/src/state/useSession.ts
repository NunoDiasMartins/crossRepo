import { useEffect, useMemo, useState } from 'react';
import { EventType } from '@ag-ui/client';
import { openEventStream, sendAction, startRun } from '../client/api';
import type { A2UISurface, AgentEvent, UIInteractionEvent } from '@demo/shared';

export const useSession = () => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [surfaces, setSurfaces] = useState<Record<string, A2UISurface>>({});
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  useEffect(() => {
    const stream = openEventStream(sessionId);

    stream.onmessage = (message) => {
      const event = JSON.parse(message.data) as AgentEvent;
      setEvents((prev) => [...prev, event]);

      if (event.type === EventType.RUN_STARTED || event.type.toLowerCase().includes('run_started')) {
        setStatus('running');
      }
      if (event.type === EventType.RUN_FINISHED || event.type.toLowerCase().includes('run_finished')) {
        setStatus('completed');
      }

      if (event.type.includes('state.updated') && event.data) {
        const nextSurfaces = (event.data as { state: { surfaces: Record<string, A2UISurface> } }).state.surfaces;
        setSurfaces({ ...nextSurfaces });
      }

      if (event.type === 'undo.applied' && event.data) {
        const nextSurfaces = (event.data as { state: { surfaces: Record<string, A2UISurface> } }).state.surfaces;
        setSurfaces({ ...nextSurfaces });
      }

      if (event.type.startsWith('replay.ready.') && event.data && event.type.includes('state.updated')) {
        const replaySurfaces = (event.data as { state: { surfaces: Record<string, A2UISurface> } }).state.surfaces;
        setSurfaces({ ...replaySurfaces });
      }
    };

    return () => stream.close();
  }, [sessionId]);

  const runPrompt = async (): Promise<void> => {
    setStatus('running');
    await startRun(sessionId, 'Analyze last quarter sales, identify anomalies, and explain what caused them.');
  };

  const dispatch = async (event: UIInteractionEvent): Promise<void> => {
    await sendAction(sessionId, event);
  };

  return {
    sessionId,
    status,
    events,
    surfaces: useMemo(() => Object.values(surfaces), [surfaces]),
    runPrompt,
    dispatch
  };
};
