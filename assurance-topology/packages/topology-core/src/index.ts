import type { AlarmFilter, TopologyAlarm, TopologyEdge, TopologyGraph, TopologyNode } from "@assurance-topology/topology-types";

export * from "@assurance-topology/topology-types";

export function filterAlarms(alarms: TopologyAlarm[], filter?: AlarmFilter): TopologyAlarm[] {
  if (!filter) return alarms;

  return alarms.filter((alarm) => {
    if (filter.severities && filter.severities.length > 0 && !filter.severities.includes(alarm.severity)) {
      return false;
    }
    if (filter.statuses && filter.statuses.length > 0 && alarm.status && !filter.statuses.includes(alarm.status)) {
      return false;
    }
    if (filter.entityTypes && filter.entityTypes.length > 0 && !filter.entityTypes.includes(alarm.entityType)) {
      return false;
    }
    return true;
  });
}

export function computeGraphBounds(graph: TopologyGraph): [[number, number], [number, number]] | null {
  const points: Array<{ lat: number; lng: number }> = [];
  graph.nodes.forEach((node) => points.push(node.coordinates));
  graph.edges.forEach((edge) => edge.path?.forEach((p) => points.push(p)));

  if (points.length === 0) return null;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function findNode(graph: TopologyGraph, nodeId: string): TopologyNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

export function findEdge(graph: TopologyGraph, edgeId: string): TopologyEdge | undefined {
  return graph.edges.find((edge) => edge.id === edgeId);
}
