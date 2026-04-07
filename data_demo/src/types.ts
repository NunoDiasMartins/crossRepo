import type { Message, State, Context, Tool } from '@ag-ui/core';

export type DemoState = State & {
  filterRegion: string;
  surfaces: Record<string, A2UINode>;
  anomalies: Anomaly[];
  timeline: string[];
};

export type DemoContext = Context & {
  uiEvent?: UIEvent;
};

export type DemoMessage = Message;
export type DemoTool = Tool;

export type UIEvent =
  | { type: 'filter.changed'; payload: { region: string } }
  | { type: 'anomaly.selected'; payload: { week: string } }
  | { type: 'action.triggered'; payload: { action: 'forecast' | 'replay' } };

export type SalesRecord = {
  week: string;
  region: string;
  revenue: number;
  orders: number;
};

export type CampaignRecord = {
  week: string;
  campaign: string;
  region: string;
  channel: string;
  spend: number;
  impact: 'positive_spike' | 'negative_dip' | 'ambiguous';
};

export type Anomaly = {
  week: string;
  region: string;
  deviationPct: number;
  type: 'positive_spike' | 'negative_dip' | 'ambiguous';
  explanation: string;
};

export type A2UINode = {
  type: string;
  id?: string;
  title?: string;
  text?: string;
  status?: string;
  highlight?: boolean;
  chartType?: 'line' | 'bar';
  x?: string;
  y?: string;
  points?: Array<Record<string, string | number>>;
  rows?: Array<Record<string, string | number>>;
  items?: string[];
  actions?: Array<{ id: string; label: string; event: UIEvent }>;
  children?: A2UINode[];
};

export type AgentEvent = {
  type: string;
  threadId?: string;
  runId?: string;
  messageId?: string;
  delta?: string;
  data?: unknown;
};
