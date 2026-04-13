export type SurfaceName =
  | 'service-overview'
  | 'impact-topology'
  | 'kpi-correlation'
  | 'root-cause-analysis'
  | 'resolution-summary';

export type ActionType = 'VIEW_IMPACT' | 'ANALYZE_KPIS' | 'SHOW_RCA' | 'APPLY_FIX';

export type SurfaceSchema = {
  surface: SurfaceName;
  title: string;
  component: 'ServiceOverviewCard' | 'TopologyView' | 'KpiCorrelationPanel' | 'RcaPanel' | 'ResolutionPanel';
  props: Record<string, unknown>;
};

export type TimelineItem = {
  kind: 'agent' | 'user' | 'event';
  text: string;
  badge?: string;
};

export type AppState = {
  service?: {
    id: string;
    name: string;
    slaCompliance: number;
    latencyP95: number;
    activeAlarms: number;
    impactedEndpoints: number;
  };
  alarms?: Array<{ id: string; severity: string; text: string }>;
  entities?: {
    slice: string;
    region: string;
    impactedGnbs: string[];
    impactedCells: string[];
    transportPath: string;
  };
  remediationOptions?: Array<{ id: string; title: string; risk: string; expectedLatencyGainMs: number }>;
};
