import {
  GraphEventName,
  GraphPatch,
  GraphSnapshot,
  OverlayDatum,
  TopologyEdge,
  TopologyNode,
} from "./types.js";

export type GraphListener = (snapshot: GraphSnapshot) => void;

/**
 * Headless topology graph store.
 * - Pure TypeScript
 * - No DOM or rendering logic
 * - Separates topology structure from overlays (alarms/KPIs)
 */
export class GraphStore {
  private nodes = new Map<string, TopologyNode>();
  private edges = new Map<string, TopologyEdge>();
  private overlays = new Map<string, OverlayDatum>();
  private listeners = new Map<GraphEventName, Set<GraphListener>>();

  getSnapshot(): GraphSnapshot {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
      overlays: [...this.overlays.values()],
    };
  }

  setGraph(graph: GraphSnapshot): void {
    this.nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    this.edges = new Map(graph.edges.map((edge) => [edge.id, edge]));
    this.overlays = new Map(graph.overlays.map((overlay) => [overlay.id, overlay]));
    this.emit("nodesChanged");
    this.emit("edgesChanged");
    this.emit("overlaysChanged");
  }

  /**
   * Apply patch-based updates (ADD / UPDATE / REMOVE).
   */
  applyPatches(patches: GraphPatch[]): void {
    let nodesTouched = false;
    let edgesTouched = false;
    let overlaysTouched = false;

    for (const patch of patches) {
      if (patch.op === "ADD" || patch.op === "UPDATE") {
        if (patch.node) {
          this.nodes.set(patch.node.id, patch.node);
          nodesTouched = true;
        }
        if (patch.edge) {
          this.edges.set(patch.edge.id, patch.edge);
          edgesTouched = true;
        }
        if (patch.overlay) {
          this.overlays.set(patch.overlay.id, patch.overlay);
          overlaysTouched = true;
        }
      }

      if (patch.op === "REMOVE") {
        if (patch.nodeId) {
          nodesTouched = this.nodes.delete(patch.nodeId) || nodesTouched;
        }
        if (patch.edgeId) {
          edgesTouched = this.edges.delete(patch.edgeId) || edgesTouched;
        }
        if (patch.overlayId) {
          overlaysTouched = this.overlays.delete(patch.overlayId) || overlaysTouched;
        }
      }
    }

    if (nodesTouched) {
      this.emit("nodesChanged");
    }
    if (edgesTouched) {
      this.emit("edgesChanged");
    }
    if (overlaysTouched) {
      this.emit("overlaysChanged");
    }
  }

  on(event: GraphEventName, listener: GraphListener): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  private emit(event: GraphEventName): void {
    const snapshot = this.getSnapshot();
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(snapshot);
    }
  }
}
