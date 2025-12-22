import type { GraphSnapshot, TopologyNode } from "@assurance-topology/core";

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  /**
   * Optional: supply a WebGL2 context for advanced integration.
   */
  gl?: WebGL2RenderingContext;
}

export interface RenderState {
  zoom: number;
  pan: { x: number; y: number };
  viewport: { width: number; height: number };
}

/**
 * WebGL renderer optimized for large graphs and dense polylines.
 * This is intentionally lightweight and framework-agnostic.
 *
 * Suggested helpers (optional, not hard requirements):
 * - twgl.js for buffer management
 * - gl-matrix for math utilities
 */
export class WebGLTopologyRenderer {
  private gl: WebGL2RenderingContext;
  private graph: GraphSnapshot | null = null;
  private state: RenderState = {
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewport: { width: 1, height: 1 },
  };

  constructor(options: RendererOptions) {
    this.gl = options.gl ?? this.getContext(options.canvas);
    this.resize(options.canvas.width, options.canvas.height);
  }

  setGraph(graph: GraphSnapshot): void {
    this.graph = graph;
  }

  updateView(state: Partial<RenderState>): void {
    this.state = {
      ...this.state,
      ...state,
      pan: state.pan ?? this.state.pan,
      viewport: state.viewport ?? this.state.viewport,
    };
  }

  resize(width: number, height: number): void {
    this.state.viewport = { width, height };
    this.gl.viewport(0, 0, width, height);
  }

  render(): void {
    const { gl } = this;
    gl.clearColor(0.04, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!this.graph) {
      return;
    }

    // Placeholder draw flow: in production, batch nodes/edges into buffers.
    this.drawNodes(this.graph.nodes);
  }

  /**
   * LOD behavior: only render labels at high zoom.
   */
  shouldRenderLabels(): boolean {
    return this.state.zoom >= 2.5;
  }

  private drawNodes(nodes: TopologyNode[]): void {
    // In a real implementation, this would use GPU buffers and instancing.
    // This stub keeps the API and leaves optimized rendering as an extension point.
    void nodes;
  }

  private getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!gl) {
      throw new Error("WebGL2 is required for the topology renderer.");
    }
    return gl;
  }
}
