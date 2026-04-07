import { AbstractAgent, EventType, type RunAgent, type RunAgentInput } from '@ag-ui/client';
import { Observable } from 'rxjs';
import salesData from './data/sales_q3.json';
import campaignsData from './data/campaigns.json';
import type {
  AgentEvent,
  Anomaly,
  CampaignRecord,
  DemoContext,
  DemoState,
  SalesRecord,
  UIEvent,
  A2UINode
} from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL_STATE: DemoState = {
  filterRegion: 'all',
  surfaces: {},
  anomalies: [],
  timeline: []
};

export class AnalyticsAgent extends AbstractAgent {
  private state: DemoState = { ...INITIAL_STATE };

  run(input: RunAgentInput): RunAgent {
    const runId = input.runId ?? crypto.randomUUID();
    const threadId = input.threadId ?? 'demo-thread';
    const context = (input.context as DemoContext) ?? {};

    return () =>
      new Observable((observer) => {
        const emit = (event: AgentEvent) => observer.next(event);

        const runAsync = async () => {
          emit({ type: EventType.RUN_STARTED, threadId, runId });

          const uiEvent = context.uiEvent;
          if (!uiEvent) {
            await this.runMainScenario(threadId, runId, emit);
          } else {
            await this.handleInteractiveEvent(uiEvent, threadId, runId, emit);
          }

          emit({ type: EventType.RUN_FINISHED, threadId, runId });
          observer.complete();
        };

        runAsync().catch((error) => observer.error(error));
      });
  }

  getEventReplay(): AgentEvent[] {
    return [...(this.state.timeline as unknown as AgentEvent[])];
  }

  private track(event: AgentEvent): void {
    (this.state.timeline as unknown as AgentEvent[]).push(event);
  }

  private async runMainScenario(
    threadId: string,
    runId: string,
    emit: (event: AgentEvent) => void
  ): Promise<void> {
    const messageId = crypto.randomUUID();
    const send = (event: AgentEvent) => {
      this.track(event);
      emit(event);
    };

    send({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' as never });
    send({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: 'Starting quarterly sales analysis...' });

    await this.emitStep('plan.created', threadId, runId, send, this.buildPlanSurface());
    await this.emitStep('dataset.loaded', threadId, runId, send, this.buildDatasetSurface());

    const weekly = this.aggregateWeekly(this.state.filterRegion);
    await this.emitStep(
      'transform.applied',
      threadId,
      runId,
      send,
      this.buildActivitySurface('Transformed sales into weekly revenue series.')
    );

    await this.emitStep('chart.created', threadId, runId, send, this.buildDataSurface(weekly));

    const anomalies = this.detectAnomalies(weekly);
    this.state.anomalies = anomalies;
    await this.emitStep('anomalies.detected', threadId, runId, send, this.buildAnomalySurface(anomalies));

    await this.emitStep('annotations.added', threadId, runId, send, this.buildAnnotatedChartSurface(weekly, anomalies));

    await this.emitStep('explanation.generated', threadId, runId, send, this.buildExplanationSurface(anomalies));

    await this.emitStep('suggestion.offered', threadId, runId, send, this.buildControlSurface());

    send({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: 'Finished. Select a filter, anomaly, or forecast action to continue.'
    });
    send({ type: EventType.TEXT_MESSAGE_END, messageId });
  }

  private async handleInteractiveEvent(
    uiEvent: UIEvent,
    threadId: string,
    runId: string,
    emit: (event: AgentEvent) => void
  ): Promise<void> {
    const send = (event: AgentEvent) => {
      this.track(event);
      emit(event);
    };

    send({ type: 'ui.event.received', threadId, runId, data: uiEvent });

    if (uiEvent.type === 'filter.changed') {
      this.state.filterRegion = uiEvent.payload.region;
      const weekly = this.aggregateWeekly(this.state.filterRegion);
      const anomalies = this.detectAnomalies(weekly);
      this.state.anomalies = anomalies;
      await this.emitStep('transform.applied', threadId, runId, send, this.buildActivitySurface(`Applied ${uiEvent.payload.region} filter.`));
      await this.emitStep('chart.created', threadId, runId, send, this.buildDataSurface(weekly));
      await this.emitStep('anomalies.detected', threadId, runId, send, this.buildAnomalySurface(anomalies));
    }

    if (uiEvent.type === 'anomaly.selected') {
      const selected = this.state.anomalies.find((item) => item.week === uiEvent.payload.week);
      await this.emitStep(
        'explanation.generated',
        threadId,
        runId,
        send,
        this.buildDrillDownSurface(selected)
      );
    }

    if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'forecast') {
      await this.emitStep('forecast.generated', threadId, runId, send, this.buildForecastSurface());
    }

    if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'replay') {
      const replay = this.getEventReplay();
      send({ type: 'replay.ready', threadId, runId, data: replay });
    }
  }

  private async emitStep(
    stepType: string,
    threadId: string,
    runId: string,
    emit: (event: AgentEvent) => void,
    surface: A2UINode
  ): Promise<void> {
    await delay(500);
    this.state.surfaces[surface.id ?? crypto.randomUUID()] = surface;

    emit({ type: stepType, threadId, runId, data: { surface } });
    emit({ type: 'state.updated', threadId, runId, data: { state: this.state } });
  }

  private aggregateWeekly(region: string): Array<{ week: string; revenue: number }> {
    const filtered = (salesData as SalesRecord[]).filter((row) => region === 'all' || row.region === region);
    const grouped = new Map<string, number>();

    for (const row of filtered) {
      grouped.set(row.week, (grouped.get(row.week) ?? 0) + row.revenue);
    }

    return [...grouped.entries()]
      .map(([week, revenue]) => ({ week, revenue }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private detectAnomalies(series: Array<{ week: string; revenue: number }>): Anomaly[] {
    const avg = series.reduce((sum, row) => sum + row.revenue, 0) / Math.max(series.length, 1);

    return series
      .filter((row) => Math.abs((row.revenue - avg) / avg) > 0.12)
      .map((row) => {
        const relatedCampaign = (campaignsData as CampaignRecord[]).find((campaign) => campaign.week === row.week);
        const deviationPct = Number((((row.revenue - avg) / avg) * 100).toFixed(1));
        const type = relatedCampaign?.impact ?? (deviationPct > 0 ? 'positive_spike' : 'negative_dip');

        return {
          week: row.week,
          region: this.state.filterRegion,
          deviationPct,
          type,
          explanation: relatedCampaign
            ? `${relatedCampaign.campaign} (${relatedCampaign.channel}) likely drove this movement.`
            : 'No campaign correlation found; likely macro or inventory effects.'
        };
      });
  }

  private buildPlanSurface(): A2UINode {
    return {
      type: 'surface',
      id: 'plan_surface',
      title: 'Execution Plan',
      children: [
        {
          type: 'list',
          items: [
            'Load sales + campaign datasets',
            'Transform to weekly aggregates',
            'Detect anomalies and classify causes',
            'Annotate chart + summarize recommendations'
          ]
        }
      ]
    };
  }

  private buildDatasetSurface(): A2UINode {
    return {
      type: 'surface',
      id: 'data_surface',
      title: 'Datasets',
      children: [
        {
          type: 'table',
          rows: (salesData as SalesRecord[]).slice(0, 5)
        }
      ]
    };
  }

  private buildDataSurface(series: Array<{ week: string; revenue: number }>): A2UINode {
    return {
      type: 'surface',
      id: 'data_surface',
      title: `Weekly Revenue (${this.state.filterRegion})`,
      children: [
        {
          type: 'chart',
          chartType: 'line',
          x: 'week',
          y: 'revenue',
          points: series
        }
      ]
    };
  }

  private buildAnomalySurface(anomalies: Anomaly[]): A2UINode {
    return {
      type: 'surface',
      id: 'activity_surface',
      title: 'Anomaly Log',
      children: [
        {
          type: 'table',
          rows: anomalies.map((item) => ({
            week: item.week,
            type: item.type,
            deviationPct: item.deviationPct,
            explanation: item.explanation
          }))
        }
      ]
    };
  }

  private buildAnnotatedChartSurface(
    series: Array<{ week: string; revenue: number }>,
    anomalies: Anomaly[]
  ): A2UINode {
    return {
      type: 'surface',
      id: 'data_surface',
      title: 'Annotated Revenue Chart',
      children: [
        {
          type: 'chart',
          chartType: 'line',
          x: 'week',
          y: 'revenue',
          points: series.map((point) => ({
            ...point,
            highlight: anomalies.some((anomaly) => anomaly.week === point.week)
          }))
        }
      ]
    };
  }

  private buildExplanationSurface(anomalies: Anomaly[]): A2UINode {
    return {
      type: 'surface',
      id: 'activity_surface',
      title: 'Causal Explanation',
      children: anomalies.map((item) => ({
        type: 'card',
        id: `anomaly-${item.week}`,
        title: `${item.week}: ${item.type}`,
        text: `${item.deviationPct}% vs baseline. ${item.explanation}`
      }))
    };
  }

  private buildControlSurface(): A2UINode {
    return {
      type: 'surface',
      id: 'control_surface',
      title: 'Controls',
      children: [
        {
          type: 'actions',
          actions: [
            {
              id: 'filter-eu',
              label: 'Filter to Europe',
              event: { type: 'filter.changed', payload: { region: 'Europe' } }
            },
            {
              id: 'forecast',
              label: 'Generate Forecast',
              event: { type: 'action.triggered', payload: { action: 'forecast' } }
            },
            {
              id: 'replay',
              label: 'Replay Events',
              event: { type: 'action.triggered', payload: { action: 'replay' } }
            }
          ]
        }
      ]
    };
  }

  private buildActivitySurface(text: string): A2UINode {
    return {
      type: 'surface',
      id: 'activity_surface',
      title: 'Agent Activity',
      children: [{ type: 'text', text }]
    };
  }

  private buildDrillDownSurface(selected?: Anomaly): A2UINode {
    return {
      type: 'surface',
      id: 'activity_surface',
      title: 'Anomaly Drill-down',
      children: [
        {
          type: 'card',
          title: selected?.week ?? 'Unknown week',
          text: selected
            ? `${selected.type} at ${selected.deviationPct}% deviation. ${selected.explanation}`
            : 'No anomaly was found for that week.'
        }
      ]
    };
  }

  private buildForecastSurface(): A2UINode {
    const base = this.aggregateWeekly(this.state.filterRegion);
    const last = base[base.length - 1]?.revenue ?? 150000;
    const forecast = [1, 2, 3].map((weekOffset) => ({
      week: `2025-W${36 + weekOffset}`,
      revenue: Math.round(last * (1 + weekOffset * 0.015))
    }));

    return {
      type: 'surface',
      id: 'data_surface',
      title: '3-Week Forecast',
      children: [
        {
          type: 'chart',
          chartType: 'line',
          x: 'week',
          y: 'revenue',
          points: [...base.slice(-3), ...forecast]
        }
      ]
    };
  }
}
