import { GraphStore, type GraphPatch, type GraphSnapshot, type TopologyNode } from "@assurance-topology/core";
import { WebGLTopologyRenderer } from "@assurance-topology/render-webgl";
import type { MapAdapter, MapAdapterFactory, MapViewState } from "@assurance-topology/map-adapter";

export type InteractionEventDetail =
  | { type: "node-selected"; nodeId: string }
  | { type: "edge-selected"; edgeId: string }
  | { type: "request-rca"; targetId: string };

export interface AssuranceTopologyOptions {
  mapAdapterFactory?: MapAdapterFactory;
}

interface HitRecord {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Basic spatial index for hit testing.
 * Replace with a high-performance index like RBush for production.
 */
class SpatialIndex {
  private items: HitRecord[] = [];

  load(records: HitRecord[]): void {
    this.items = records;
  }

  search(point: { x: number; y: number }): HitRecord | null {
    return (
      this.items.find(
        (item) =>
          point.x >= item.minX &&
          point.x <= item.maxX &&
          point.y >= item.minY &&
          point.y <= item.maxY
      ) ?? null
    );
  }
}

export class AssuranceTopologyElement extends HTMLElement {
  private graphStore = new GraphStore();
  private renderer: WebGLTopologyRenderer;
  private canvas: HTMLCanvasElement;
  private mapContainer: HTMLDivElement;
  private mapAdapter: MapAdapter | null = null;
  private spatialIndex = new SpatialIndex();
  private mapViewState: MapViewState = {
    center: { lon: 0, lat: 0 },
    zoom: 2,
  };

  constructor(options: AssuranceTopologyOptions = {}) {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "100%";

    this.mapContainer = document.createElement("div");
    this.mapContainer.style.position = "absolute";
    this.mapContainer.style.inset = "0";

    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";

    container.appendChild(this.mapContainer);
    container.appendChild(this.canvas);
    shadow.appendChild(container);

    this.renderer = new WebGLTopologyRenderer({ canvas: this.canvas });

    if (options.mapAdapterFactory) {
      this.mapAdapter = options.mapAdapterFactory.create(
        {
          container: this.mapContainer,
          onViewStateChange: (state) => this.onMapViewStateChange(state),
        },
        this.renderer
      );
      this.mapAdapter.attachOverlay(this.canvas);
    }

    this.graphStore.on("nodesChanged", (snapshot) => this.onGraphChanged(snapshot));
    this.graphStore.on("edgesChanged", (snapshot) => this.onGraphChanged(snapshot));
    this.graphStore.on("overlaysChanged", (snapshot) => this.onGraphChanged(snapshot));
  }

  connectedCallback(): void {
    this.resize();
    this.canvas.addEventListener("mousemove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("click", (event) => this.onClick(event));
  }

  disconnectedCallback(): void {
    this.mapAdapter?.destroy();
  }

  setGraph(graph: GraphSnapshot): void {
    this.graphStore.setGraph(graph);
  }

  applyPatches(patches: GraphPatch[]): void {
    this.graphStore.applyPatches(patches);
  }

  getRenderer(): WebGLTopologyRenderer {
    return this.renderer;
  }

  getMapContainer(): HTMLDivElement {
    return this.mapContainer;
  }

  attachMapAdapter(mapAdapter: MapAdapter): void {
    this.mapAdapter = mapAdapter;
    this.mapAdapter.attachOverlay(this.canvas);
  }

  requestRca(targetId: string): void {
    this.dispatchInteraction({ type: "request-rca", targetId });
  }

  private onGraphChanged(snapshot: GraphSnapshot): void {
    this.renderer.setGraph(snapshot);
    this.rebuildIndex(snapshot.nodes);
    this.renderer.render();
  }

  private rebuildIndex(nodes: TopologyNode[]): void {
    const hitRecords = nodes.map((node) => {
      const point = this.project(node.position.lon, node.position.lat);
      return {
        id: node.id,
        minX: point.x - 6,
        minY: point.y - 6,
        maxX: point.x + 6,
        maxY: point.y + 6,
      };
    });

    this.spatialIndex.load(hitRecords);
  }

  private onPointerMove(event: MouseEvent): void {
    const target = this.hitTest(event);
    if (target) {
      this.canvas.style.cursor = "pointer";
    } else {
      this.canvas.style.cursor = "default";
    }
  }

  private onClick(event: MouseEvent): void {
    const target = this.hitTest(event);
    if (target) {
      this.dispatchInteraction({ type: "node-selected", nodeId: target.id });
    }
  }

  private hitTest(event: MouseEvent): HitRecord | null {
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    return this.spatialIndex.search(point);
  }

  private project(lon: number, lat: number): { x: number; y: number } {
    // Simplified projection for demo purposes.
    const { width, height } = this.canvas.getBoundingClientRect();
    return {
      x: ((lon + 180) / 360) * width,
      y: ((90 - lat) / 180) * height,
    };
  }

  private resize(): void {
    const { width, height } = this.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));
    this.renderer.resize(this.canvas.width, this.canvas.height);
    this.renderer.render();
  }

  private onMapViewStateChange(state: MapViewState): void {
    this.mapViewState = state;
    this.renderer.updateView({
      zoom: state.zoom,
    });
    this.renderer.render();
  }

  private dispatchInteraction(detail: InteractionEventDetail): void {
    this.dispatchEvent(
      new CustomEvent<InteractionEventDetail>("assurance-interaction", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("assurance-topology", AssuranceTopologyElement);
