import type { WebGLTopologyRenderer } from "@assurance-topology/render-webgl";

export interface MapViewState {
  center: { lon: number; lat: number };
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapAdapterOptions {
  container: HTMLElement;
  onViewStateChange?: (state: MapViewState) => void;
}

export interface MapAdapter {
  attachOverlay(canvas: HTMLCanvasElement): void;
  setViewState(state: MapViewState): void;
  destroy(): void;
}

/**
 * Generic map adapter contract for swapping map engines.
 *
 * Suggested engines (offline-friendly):
 * - MapLibre GL JS (vector/raster with offline tile packs)
 * - OpenLayers (local raster tiles)
 */
export interface MapAdapterFactory {
  create(options: MapAdapterOptions, renderer: WebGLTopologyRenderer): MapAdapter;
}
