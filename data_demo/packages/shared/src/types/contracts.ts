import type { Context, Message, RunAgentInput, State, Tool } from '@ag-ui/core';

export type DemoMessage = Message;
export type DemoTool = Tool;

export type RunInput = RunAgentInput & {
  context?: DemoContext;
};

export type DemoContext = Context & {
  sessionId?: string;
  uiEvent?: UIInteractionEvent;
};

export type PlanStepStatus = 'pending' | 'running' | 'completed';

export type PlanStep = {
  id: string;
  label: string;
  status: PlanStepStatus;
};

export type DemoState = State & {
  sessionId: string;
  runId: string;
  regionFilter: string;
  channelFilter: string;
  productFilter: string;
  anomalySensitivity: number;
  selectedAnomalyWeek?: string;
  surfaces: Record<string, A2UISurface>;
  activityFeed: string[];
  planSteps: PlanStep[];
};

export type SalesRow = {
  week: string;
  region: 'Europe' | 'North America' | 'APAC';
  channel: 'Online' | 'Retail' | 'Partner';
  category: 'Hardware' | 'Software' | 'Services';
  revenue: number;
  units: number;
};

export type CampaignRow = {
  week: string;
  campaign: string;
  region: 'Europe' | 'North America' | 'APAC' | 'all';
  channel: 'Online' | 'Retail' | 'Partner' | 'all';
  impact: 'positive_spike' | 'negative_dip' | 'ambiguous';
  note: string;
};

export type WeeklyRevenue = {
  week: string;
  revenue: number;
};

export type Anomaly = {
  week: string;
  revenue: number;
  deviationPct: number;
  kind: 'positive_spike' | 'negative_dip' | 'ambiguous';
  cause: string;
};

export type UIInteractionEvent =
  | { type: 'filter.changed'; payload: { region?: string; channel?: string; category?: string; sensitivity?: number } }
  | { type: 'anomaly.selected'; payload: { week: string } }
  | { type: 'action.triggered'; payload: { action: 'forecast' | 'segment' | 'drill' | 'undo' | 'replay' } };

export type AgentEvent = {
  type: string;
  sessionId: string;
  runId: string;
  timestamp: string;
  data?: unknown;
};

export type A2UINode = {
  type: string;
  id?: string;
  title?: string;
  text?: string;
  status?: string;
  chartType?: 'line' | 'bar';
  x?: string;
  y?: string;
  points?: Array<Record<string, string | number | boolean>>;
  rows?: Array<Record<string, string | number>>;
  items?: string[];
  controls?: Array<{ id: string; label: string; controlType: 'select' | 'slider'; options?: string[]; min?: number; max?: number; step?: number; value?: string | number }>;
  actions?: Array<{ id: string; label: string; event: UIInteractionEvent }>;
  children?: A2UINode[];
};

export type A2UISurface = A2UINode & {
  type: 'surface';
  id: 'plan_surface' | 'data_surface' | 'activity_surface' | 'control_surface';
};
