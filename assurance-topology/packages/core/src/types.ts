export type NodeId = string;
export type EdgeId = string;

export interface TopologyNode {
  id: NodeId;
  label?: string;
  position: {
    lon: number;
    lat: number;
  };
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  path?: Array<{ lon: number; lat: number }>;
  metadata?: Record<string, unknown>;
}

export type OverlayKind = "alarm" | "kpi" | "annotation";

export interface OverlayDatum {
  id: string;
  kind: OverlayKind;
  targetId: NodeId | EdgeId;
  severity?: "info" | "warning" | "critical";
  payload?: Record<string, unknown>;
}

export type GraphPatch =
  | { op: "ADD"; node?: TopologyNode; edge?: TopologyEdge; overlay?: OverlayDatum }
  | { op: "UPDATE"; node?: TopologyNode; edge?: TopologyEdge; overlay?: OverlayDatum }
  | { op: "REMOVE"; nodeId?: NodeId; edgeId?: EdgeId; overlayId?: string };

export interface GraphSnapshot {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  overlays: OverlayDatum[];
}

export interface GraphEvents {
  nodesChanged: GraphSnapshot;
  edgesChanged: GraphSnapshot;
  overlaysChanged: GraphSnapshot;
}

export type GraphEventName = keyof GraphEvents;
