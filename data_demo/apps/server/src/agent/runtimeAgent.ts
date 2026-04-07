import { AbstractAgent, EventType, type RunAgent } from '@ag-ui/client';
import type { RunAgentInput } from '@ag-ui/core';
import { Observable } from 'rxjs';
import { AnalysisPipeline } from '../analysis/pipeline.js';
import { ScenarioEvents, type A2UISurface, type AgentEvent, type Anomaly, type DemoState, type PlanStep, type UIInteractionEvent, makeSurface } from '@demo/shared';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const basePlanSteps = (): PlanStep[] => [
  { id: 'load', label: 'Load datasets', status: 'pending' },
  { id: 'transform', label: 'Aggregate weekly revenue', status: 'pending' },
  { id: 'detect', label: 'Detect anomalies', status: 'pending' },
  { id: 'explain', label: 'Generate causal explanation', status: 'pending' },
  { id: 'suggest', label: 'Offer next actions', status: 'pending' }
];

export class BackendAnalyticsAgent extends AbstractAgent {
  private pipeline = new AnalysisPipeline();

  run(input: RunAgentInput): RunAgent {
    const context = (input.context ?? {}) as { sessionId?: string; uiEvent?: UIInteractionEvent };
    const sessionId = context.sessionId ?? 'demo-session';
    const runId = input.runId ?? crypto.randomUUID();
    const state: DemoState = {
      sessionId,
      runId,
      regionFilter: 'all',
      channelFilter: 'all',
      productFilter: 'all',
      anomalySensitivity: 0.14,
      surfaces: {},
      activityFeed: [],
      planSteps: basePlanSteps()
    } as DemoState;

    const emitEvent = (type: string, data?: unknown): AgentEvent => ({
      type,
      sessionId,
      runId,
      timestamp: new Date().toISOString(),
      data
    });

    return () =>
      new Observable((observer) => {
        const push = (event: AgentEvent) => observer.next(event);

        const runFlow = async () => {
          push(emitEvent(EventType.RUN_STARTED));

          if (!context.uiEvent) {
            await this.fullScenario(state, push, emitEvent);
          } else {
            await this.interactiveScenario(state, context.uiEvent, push, emitEvent);
          }

          push(emitEvent(EventType.RUN_FINISHED));
          observer.complete();
        };

        runFlow().catch((err) => observer.error(err));
      });
  }

  private async fullScenario(
    state: DemoState,
    push: (event: AgentEvent) => void,
    emit: (type: string, data?: unknown) => AgentEvent
  ): Promise<void> {
    push(emit(EventType.TEXT_MESSAGE_START, { role: 'assistant' }));
    push(emit(EventType.TEXT_MESSAGE_CONTENT, { delta: 'Analyzing last quarter sales for anomalies and causes...' }));

    await this.step(state, push, emit, ScenarioEvents.PLAN_CREATED, 'Loading plan...', () => this.planSurface(state, 'load'));
    await this.step(state, push, emit, ScenarioEvents.DATASET_LOADED, 'Loading sales dataset…', () => this.datasetSurface(state));
    await this.step(state, push, emit, ScenarioEvents.TRANSFORM_APPLIED, 'Aggregating weekly revenue…', () => this.trendSurface(state));
    await this.step(state, push, emit, ScenarioEvents.CHART_CREATED, 'Rendering trend + anomaly candidates…', () => this.annotatedDataSurface(state));
    await this.step(state, push, emit, ScenarioEvents.ANOMALIES_DETECTED, 'Detecting anomalies…', () => this.explanationSurface(state));
    await this.step(state, push, emit, ScenarioEvents.ANNOTATIONS_ADDED, 'Correlating anomalies with campaigns…', () => this.explanationSurface(state));
    await this.step(state, push, emit, ScenarioEvents.EXPLANATION_GENERATED, 'Generating concise explanations…', () => this.explanationSurface(state));
    await this.step(state, push, emit, ScenarioEvents.SUGGESTION_OFFERED, 'Producing recommendations...', () => this.controlSurface(state));

    push(emit(EventType.TEXT_MESSAGE_CONTENT, { delta: 'Analysis complete. Use controls to filter, segment, drill down, forecast, or replay.' }));
    push(emit(EventType.TEXT_MESSAGE_END));
  }

  private async interactiveScenario(
    state: DemoState,
    uiEvent: UIInteractionEvent,
    push: (event: AgentEvent) => void,
    emit: (type: string, data?: unknown) => AgentEvent
  ): Promise<void> {
    push(emit('ui.event.received', uiEvent));

    if (uiEvent.type === 'filter.changed') {
      state.regionFilter = uiEvent.payload.region ?? state.regionFilter;
      state.channelFilter = uiEvent.payload.channel ?? state.channelFilter;
      state.productFilter = uiEvent.payload.category ?? state.productFilter;
      state.anomalySensitivity = uiEvent.payload.sensitivity ?? state.anomalySensitivity;
      await this.step(state, push, emit, ScenarioEvents.TRANSFORM_APPLIED, 'Applying filters from control surface…', () => this.trendSurface(state));
      await this.step(state, push, emit, ScenarioEvents.ANOMALIES_DETECTED, 'Refreshing anomaly markers after filter update…', () => this.explanationSurface(state));
    }

    if (uiEvent.type === 'anomaly.selected') {
      state.selectedAnomalyWeek = uiEvent.payload.week;
      await this.step(state, push, emit, ScenarioEvents.EXPLANATION_GENERATED, `Drilling into anomaly ${uiEvent.payload.week}…`, () => this.drillDownSurface(state));
    }

    if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'forecast') {
      await this.step(state, push, emit, ScenarioEvents.FORECAST_GENERATED, 'Forecasting next quarter…', () => this.forecastSurface(state));
    }

    if (uiEvent.type === 'action.triggered' && uiEvent.payload.action === 'segment') {
      await this.step(state, push, emit, ScenarioEvents.SEGMENTATION_GENERATED, 'Segmenting by region…', () => this.segmentSurface(state));
    }
  }

  private async step(
    state: DemoState,
    push: (event: AgentEvent) => void,
    emit: (type: string, data?: unknown) => AgentEvent,
    eventType: string,
    activity: string,
    mutate: () => A2UISurface
  ): Promise<void> {
    state.activityFeed.push(activity);
    state.surfaces.activity_surface = this.activitySurface(state);
    push(emit(ScenarioEvents.ACTIVITY_UPDATED, { surface: state.surfaces.activity_surface }));
    push(emit(ScenarioEvents.STATE_UPDATED, { state }));

    await wait(450);

    const surface = mutate();
    state.surfaces[surface.id] = surface;

    push(emit(eventType, { surface }));
    push(emit(ScenarioEvents.STATE_UPDATED, { state }));
  }

  private planSurface(state: DemoState, runningId: string): A2UISurface {
    state.planSteps = state.planSteps.map((step) => {
      if (step.id === runningId) {
        return { ...step, status: 'running' };
      }
      if (step.status === 'running') {
        return { ...step, status: 'completed' };
      }
      return step;
    });

    return makeSurface({
      type: 'surface',
      id: 'plan_surface',
      title: 'Execution Plan',
      children: [
        { type: 'text', text: 'Goal: Analyze last quarter sales, identify anomalies, and explain root causes.' },
        {
          type: 'table',
          rows: state.planSteps.map((step) => ({ step: step.label, status: step.status }))
        }
      ]
    });
  }

  private datasetSurface(state: DemoState): A2UISurface {
    state.surfaces.plan_surface = this.planSurface(state, 'transform');
    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: 'Dataset Preview',
      children: [{ type: 'table', rows: this.pipeline.datasetPreview() as unknown as Array<Record<string, string | number>> }]
    });
  }

  private trendSurface(state: DemoState): A2UISurface {
    const weekly = this.pipeline.aggregateWeekly({
      region: state.regionFilter,
      channel: state.channelFilter,
      category: state.productFilter,
      sensitivity: state.anomalySensitivity
    });
    state.surfaces.plan_surface = this.planSurface(state, 'detect');
    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: `Revenue Trend (${state.regionFilter}/${state.channelFilter}/${state.productFilter})`,
      children: [
        { type: 'chart', chartType: 'line', x: 'week', y: 'revenue', points: weekly as never },
        { type: 'table', rows: weekly as unknown as Array<Record<string, string | number>> }
      ]
    });
  }

  private annotatedDataSurface(state: DemoState): A2UISurface {
    const weekly = this.pipeline.aggregateWeekly({ region: state.regionFilter, channel: state.channelFilter, category: state.productFilter, sensitivity: state.anomalySensitivity });
    const anomalies = this.pipeline.detectAnomalies(weekly, state.anomalySensitivity);

    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: 'Trend with Anomaly Markers',
      children: [
        {
          type: 'chart',
          chartType: 'line',
          x: 'week',
          y: 'revenue',
          points: weekly.map((point) => ({
            ...point,
            highlight: anomalies.some((a) => a.week === point.week)
          }))
        }
      ]
    });
  }

  private explanationSurface(state: DemoState): A2UISurface {
    const weekly = this.pipeline.aggregateWeekly({ region: state.regionFilter, channel: state.channelFilter, category: state.productFilter, sensitivity: state.anomalySensitivity });
    const anomalies = this.pipeline.detectAnomalies(weekly, state.anomalySensitivity);
    state.surfaces.plan_surface = this.planSurface(state, 'explain');

    return makeSurface({
      type: 'surface',
      id: 'activity_surface',
      title: 'Anomalies and Causes',
      children: anomalies.map((anomaly: Anomaly) => ({
        type: 'card',
        id: anomaly.week,
        title: `${anomaly.week} · ${anomaly.kind} (${anomaly.deviationPct}%)`,
        text: anomaly.cause
      }))
    });
  }

  private drillDownSurface(state: DemoState): A2UISurface {
    const weekly = this.pipeline.aggregateWeekly({ region: state.regionFilter, channel: state.channelFilter, category: state.productFilter, sensitivity: state.anomalySensitivity });
    const anomalies = this.pipeline.detectAnomalies(weekly, state.anomalySensitivity);
    const selected = anomalies.find((a) => a.week === state.selectedAnomalyWeek);

    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: `Drill-down: ${state.selectedAnomalyWeek ?? 'n/a'}`,
      children: [
        {
          type: 'card',
          title: selected?.week ?? 'Not found',
          text: selected
            ? `Cause summary: ${selected.cause}`
            : 'The selected anomaly does not match current filters.'
        },
        {
          type: 'table',
          rows: weekly.map((row) => ({ week: row.week, revenue: row.revenue, focus: row.week === state.selectedAnomalyWeek ? 'selected' : '' }))
        }
      ]
    });
  }

  private forecastSurface(state: DemoState): A2UISurface {
    const weekly = this.pipeline.aggregateWeekly({ region: state.regionFilter, channel: state.channelFilter, category: state.productFilter, sensitivity: state.anomalySensitivity });
    const forecast = this.pipeline.forecastNextQuarter(weekly);

    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: 'Forecast (next quarter)',
      children: [
        { type: 'chart', chartType: 'line', x: 'week', y: 'revenue', points: [...weekly.slice(-4), ...forecast] as never },
        {
          type: 'card',
          title: 'Assumptions',
          text: 'Assumes continuation of recent trend with slight seasonal uplift and no severe supply disruption.'
        }
      ]
    });
  }

  private segmentSurface(state: DemoState): A2UISurface {
    const segmented = this.pipeline.segmentByRegion();
    const rows = Object.entries(segmented).map(([region, series]) => ({
      region,
      latestRevenue: series[series.length - 1]?.revenue ?? 0
    }));

    return makeSurface({
      type: 'surface',
      id: 'data_surface',
      title: 'Segmented by Region',
      children: [{ type: 'table', rows }]
    });
  }

  private controlSurface(state: DemoState): A2UISurface {
    state.surfaces.plan_surface = this.planSurface(state, 'suggest');
    state.planSteps = state.planSteps.map((step) => (step.status === 'running' ? { ...step, status: 'completed' } : step));

    return makeSurface({
      type: 'surface',
      id: 'control_surface',
      title: 'Controls',
      children: [
        {
          type: 'control-group',
          controls: [
            { id: 'region', label: 'Region', controlType: 'select', options: ['all', 'Europe', 'North America', 'APAC'], value: state.regionFilter },
            { id: 'channel', label: 'Channel', controlType: 'select', options: ['all', 'Online', 'Retail', 'Partner'], value: state.channelFilter },
            { id: 'category', label: 'Category', controlType: 'select', options: ['all', 'Hardware', 'Software', 'Services'], value: state.productFilter },
            { id: 'sensitivity', label: 'Anomaly Sensitivity', controlType: 'slider', min: 0.08, max: 0.35, step: 0.01, value: state.anomalySensitivity }
          ]
        },
        {
          type: 'actions',
          actions: [
            { id: 'forecast', label: 'Forecast next quarter', event: { type: 'action.triggered', payload: { action: 'forecast' } } },
            { id: 'segment', label: 'Segment by region', event: { type: 'action.triggered', payload: { action: 'segment' } } },
            { id: 'drill', label: 'Drill into selected anomaly', event: { type: 'action.triggered', payload: { action: 'drill' } } },
            { id: 'undo', label: 'Undo last agent action', event: { type: 'action.triggered', payload: { action: 'undo' } } },
            { id: 'replay', label: 'Replay analysis', event: { type: 'action.triggered', payload: { action: 'replay' } } }
          ]
        }
      ]
    });
  }

  private activitySurface(state: DemoState): A2UISurface {
    return makeSurface({
      type: 'surface',
      id: 'activity_surface',
      title: 'Agent Activity Feed',
      children: [{ type: 'list', items: [...state.activityFeed].reverse().slice(0, 12) }]
    });
  }
}
