import L, { type Map as LeafletMap } from "leaflet";
import { computeGraphBounds, filterAlarms, type AlarmFilter, type TileLayerConfig, type TopologyAlarm, type TopologyEdge, type TopologyGraph, type TopologyNode } from "@assurance-topology/topology-core";

export interface LeafletRendererOptions {
  container: HTMLElement;
  tileLayerConfig: TileLayerConfig;
  mapConfig?: L.MapOptions;
  onNodeClick?: (node: TopologyNode) => void;
  onEdgeClick?: (edge: TopologyEdge) => void;
  onAlarmClick?: (alarm: TopologyAlarm) => void;
  onViewportChange?: (map: LeafletMap) => void;
}

export class TopologyLeafletRenderer {
  private map: LeafletMap;
  private edgeLayer = L.layerGroup();
  private nodeLayer = L.layerGroup();
  private alarmLayer = L.layerGroup();
  private selectionLayer = L.layerGroup();
  private graph: TopologyGraph = { nodes: [], edges: [] };
  private alarms: TopologyAlarm[] = [];
  private selectedNodeId?: string;
  private selectedEdgeId?: string;
  private filter?: AlarmFilter;

  constructor(private readonly options: LeafletRendererOptions) {
    this.map = L.map(options.container, {
      zoomControl: true,
      ...options.mapConfig,
    });

    L.tileLayer(options.tileLayerConfig.urlTemplate, {
      attribution: options.tileLayerConfig.attribution,
      maxZoom: options.tileLayerConfig.maxZoom,
      subdomains: options.tileLayerConfig.subdomains,
    }).addTo(this.map);

    this.edgeLayer.addTo(this.map);
    this.nodeLayer.addTo(this.map);
    this.alarmLayer.addTo(this.map);
    this.selectionLayer.addTo(this.map);

    this.map.on("moveend zoomend", () => this.options.onViewportChange?.(this.map));
  }

  getMap(): LeafletMap { return this.map; }

  setGraph(graph: TopologyGraph): void {
    this.graph = graph;
    this.render();
  }

  setAlarms(alarms: TopologyAlarm[]): void {
    this.alarms = alarms;
    this.render();
  }

  setFilter(filter?: AlarmFilter): void {
    this.filter = filter;
    this.render();
  }

  setSelection(selectedNodeId?: string, selectedEdgeId?: string): void {
    this.selectedNodeId = selectedNodeId;
    this.selectedEdgeId = selectedEdgeId;
    this.renderSelection();
  }

  focusNode(nodeId: string): void {
    const node = this.graph.nodes.find((n) => n.id === nodeId);
    if (node) this.map.flyTo([node.coordinates.lat, node.coordinates.lng], Math.max(this.map.getZoom(), 9));
  }

  focusEdge(edgeId: string): void {
    const edge = this.graph.edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const path = edge.path ?? this.edgeFallbackPath(edge);
    this.map.fitBounds(path.map((p) => [p.lat, p.lng] as [number, number]), { padding: [24, 24] });
  }

  fitToView(): void {
    const bounds = computeGraphBounds(this.graph);
    if (bounds) this.map.fitBounds(bounds, { padding: [24, 24] });
  }

  destroy(): void {
    this.map.remove();
  }

  private render(): void {
    this.edgeLayer.clearLayers();
    this.nodeLayer.clearLayers();
    this.alarmLayer.clearLayers();

    this.graph.edges.forEach((edge) => {
      const polyline = L.polyline((edge.path ?? this.edgeFallbackPath(edge)).map((point) => [point.lat, point.lng] as [number, number]), {
        color: "#5f6c7b",
        weight: 3,
      });
      polyline.on("click", () => this.options.onEdgeClick?.(edge));
      polyline.on("mouseover", () => polyline.setStyle({ weight: 5 }));
      polyline.on("mouseout", () => polyline.setStyle({ weight: 3 }));
      polyline.addTo(this.edgeLayer);
    });

    this.graph.nodes.forEach((node) => {
      const marker = L.circleMarker([node.coordinates.lat, node.coordinates.lng], {
        radius: 8,
        color: "#0b6efd",
        fillColor: "#72a8ff",
        fillOpacity: 1,
        weight: 2,
      });
      marker.bindTooltip(node.label);
      marker.on("click", () => this.options.onNodeClick?.(node));
      marker.on("mouseover", () => marker.setStyle({ radius: 10 }));
      marker.on("mouseout", () => marker.setStyle({ radius: 8 }));
      marker.addTo(this.nodeLayer);
    });

    const visibleAlarms = filterAlarms(this.alarms, this.filter);
    visibleAlarms.forEach((alarm) => {
      if (alarm.entityType === "node") {
        const node = this.graph.nodes.find((n) => n.id === alarm.entityId);
        if (!node) return;
        const ring = L.circleMarker([node.coordinates.lat, node.coordinates.lng], {
          radius: 13,
          color: this.severityColor(alarm.severity),
          weight: 3,
          fillOpacity: 0,
        });
        ring.bindTooltip(`${alarm.label ?? alarm.severity} (${alarm.count ?? 1})`);
        ring.on("click", () => this.options.onAlarmClick?.(alarm));
        ring.addTo(this.alarmLayer);
      }
      if (alarm.entityType === "edge") {
        const edge = this.graph.edges.find((e) => e.id === alarm.entityId);
        if (!edge) return;
        const midpoint = this.midpoint(edge.path ?? this.edgeFallbackPath(edge));
        const badge = L.circleMarker([midpoint.lat, midpoint.lng], {
          radius: 7,
          color: this.severityColor(alarm.severity),
          fillColor: this.severityColor(alarm.severity),
          fillOpacity: 0.9,
          weight: 1,
        });
        badge.bindTooltip(`${alarm.label ?? alarm.severity} (${alarm.count ?? 1})`);
        badge.on("click", () => this.options.onAlarmClick?.(alarm));
        badge.addTo(this.alarmLayer);
      }
    });

    this.renderSelection();
  }

  private renderSelection(): void {
    this.selectionLayer.clearLayers();

    if (this.selectedNodeId) {
      const node = this.graph.nodes.find((n) => n.id === this.selectedNodeId);
      if (node) {
        L.circleMarker([node.coordinates.lat, node.coordinates.lng], {
          radius: 16,
          color: "#111827",
          weight: 2,
          fillOpacity: 0,
          dashArray: "4 4",
        }).addTo(this.selectionLayer);
      }
    }

    if (this.selectedEdgeId) {
      const edge = this.graph.edges.find((e) => e.id === this.selectedEdgeId);
      if (edge) {
        L.polyline((edge.path ?? this.edgeFallbackPath(edge)).map((p) => [p.lat, p.lng] as [number, number]), {
          color: "#111827",
          weight: 6,
          opacity: 0.5,
        }).addTo(this.selectionLayer);
      }
    }
  }

  private edgeFallbackPath(edge: TopologyEdge): Array<{ lat: number; lng: number }> {
    const source = this.graph.nodes.find((node) => node.id === edge.source);
    const target = this.graph.nodes.find((node) => node.id === edge.target);
    if (!source || !target) return [];
    return [source.coordinates, target.coordinates];
  }

  private midpoint(path: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
    const midIndex = Math.floor(path.length / 2);
    return path[midIndex] ?? path[0] ?? { lat: 0, lng: 0 };
  }

  private severityColor(severity: TopologyAlarm["severity"]): string {
    switch (severity) {
      case "critical": return "#dc2626";
      case "major": return "#ea580c";
      case "minor": return "#f59e0b";
      case "warning": return "#eab308";
      case "cleared": return "#16a34a";
      default: return "#6b7280";
    }
  }
}
