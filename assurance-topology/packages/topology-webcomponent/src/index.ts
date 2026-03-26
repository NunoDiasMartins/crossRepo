import type { Map as LeafletMap, MapOptions } from "leaflet";
import { type AlarmFilter, type TileLayerConfig, type TopologyAlarm, type TopologyGraph } from "@assurance-topology/topology-core";
import { TopologyLeafletRenderer } from "@assurance-topology/topology-leaflet-renderer";
import { alarmOverlayPlugin, readonlyPlugin, registerPlugins, type TopologyPlugin } from "@assurance-topology/topology-plugins";

export type TopologyMode = "readonly";

export type NodeSelectedEventDetail = { nodeId: string };
export type EdgeSelectedEventDetail = { edgeId: string };
export type AlarmSelectedEventDetail = { alarm: TopologyAlarm };
export type ViewportChangedEventDetail = { center: { lat: number; lng: number }; zoom: number };
export type MapReadyEventDetail = { map: LeafletMap };
export type ErrorEventDetail = { message: string; cause?: unknown };

export class CompanyTopologyMapElement extends HTMLElement {
  graph: TopologyGraph = { nodes: [], edges: [] };
  alarms: TopologyAlarm[] = [];
  mode: TopologyMode = "readonly";
  selectedNodeId?: string;
  selectedEdgeId?: string;
  filters?: AlarmFilter;
  tileLayerConfig: TileLayerConfig = {
    urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  };
  mapConfig?: MapOptions;
  plugins: TopologyPlugin[] = [readonlyPlugin(), alarmOverlayPlugin()];
  theme?: Record<string, unknown>;

  private renderer?: TopologyLeafletRenderer;
  private mapHost: HTMLDivElement;
  private disposePlugins?: () => void;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    this.mapHost = document.createElement("div");
    this.mapHost.style.height = "100%";
    this.mapHost.style.width = "100%";
    shadow.appendChild(this.mapHost);
  }

  connectedCallback(): void {
    try {
      this.initialize();
    } catch (cause) {
      this.emitError("Failed to initialize topology map", cause);
    }
  }

  disconnectedCallback(): void {
    this.disposePlugins?.();
    this.renderer?.destroy();
  }

  setGraph(graph: TopologyGraph): void {
    this.graph = graph;
    this.renderer?.setGraph(graph);
  }

  setAlarms(alarms: TopologyAlarm[]): void {
    this.alarms = alarms;
    this.renderer?.setAlarms(alarms);
  }

  focusNode(nodeId: string): void {
    this.selectedNodeId = nodeId;
    this.selectedEdgeId = undefined;
    this.renderer?.setSelection(this.selectedNodeId, this.selectedEdgeId);
    this.renderer?.focusNode(nodeId);
  }

  focusEdge(edgeId: string): void {
    this.selectedEdgeId = edgeId;
    this.selectedNodeId = undefined;
    this.renderer?.setSelection(this.selectedNodeId, this.selectedEdgeId);
    this.renderer?.focusEdge(edgeId);
  }

  fitToView(): void {
    this.renderer?.fitToView();
  }

  clearSelection(): void {
    this.selectedNodeId = undefined;
    this.selectedEdgeId = undefined;
    this.renderer?.setSelection(undefined, undefined);
  }

  setFilters(filters: AlarmFilter): void {
    this.filters = filters;
    this.renderer?.setFilter(filters);
  }

  private initialize(): void {
    if (this.renderer || !this.isConnected) return;

    this.renderer = new TopologyLeafletRenderer({
      container: this.mapHost,
      tileLayerConfig: this.tileLayerConfig,
      mapConfig: this.mapConfig,
      onNodeClick: (node) => {
        this.selectedNodeId = node.id;
        this.selectedEdgeId = undefined;
        this.renderer?.setSelection(this.selectedNodeId, this.selectedEdgeId);
        this.dispatchEvent(new CustomEvent<NodeSelectedEventDetail>("node-selected", { detail: { nodeId: node.id } }));
      },
      onEdgeClick: (edge) => {
        this.selectedEdgeId = edge.id;
        this.selectedNodeId = undefined;
        this.renderer?.setSelection(this.selectedNodeId, this.selectedEdgeId);
        this.dispatchEvent(new CustomEvent<EdgeSelectedEventDetail>("edge-selected", { detail: { edgeId: edge.id } }));
      },
      onAlarmClick: (alarm) => {
        this.dispatchEvent(new CustomEvent<AlarmSelectedEventDetail>("alarm-selected", { detail: { alarm } }));
      },
      onViewportChange: (map) => {
        const center = map.getCenter();
        this.dispatchEvent(new CustomEvent<ViewportChangedEventDetail>("viewport-changed", {
          detail: { center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() },
        }));
      },
    });

    this.disposePlugins = registerPlugins(this.plugins, {
      getGraph: () => this.graph,
      getAlarms: () => this.alarms,
      invalidate: () => this.renderer?.fitToView(),
    });

    this.renderer.setGraph(this.graph);
    this.renderer.setAlarms(this.alarms);
    this.renderer.setFilter(this.filters);

    this.dispatchEvent(new CustomEvent<MapReadyEventDetail>("map-ready", { detail: { map: this.renderer.getMap() } }));
  }

  private emitError(message: string, cause?: unknown): void {
    this.dispatchEvent(new CustomEvent<ErrorEventDetail>("error", { detail: { message, cause } }));
  }
}

if (!customElements.get("company-topology-map")) {
  customElements.define("company-topology-map", CompanyTopologyMapElement);
}
