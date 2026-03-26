export type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type TopologyNode = {
  id: string;
  type: string;
  label: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, unknown>;
};

export type TopologyEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  path?: Array<{ lat: number; lng: number }>;
  metadata?: Record<string, unknown>;
};

export type AlarmSeverity = "critical" | "major" | "minor" | "warning" | "cleared";

export type AlarmStatus = "active" | "acknowledged" | "cleared";

export type TopologyAlarm = {
  id: string;
  entityType: "node" | "edge";
  entityId: string;
  severity: AlarmSeverity;
  status?: AlarmStatus;
  label?: string;
  count?: number;
  metadata?: Record<string, unknown>;
};

export type AlarmFilter = {
  severities?: AlarmSeverity[];
  statuses?: AlarmStatus[];
  entityTypes?: Array<"node" | "edge">;
};

export type TileLayerConfig = {
  urlTemplate: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string[];
};
