import type { Map } from "maplibre-gl";
import type { WebGLTopologyRenderer } from "@assurance-topology/render-webgl";
import type { MapAdapter, MapAdapterFactory, MapAdapterOptions, MapViewState } from "./adapter.js";

export interface MapLibreAdapterOptions extends MapAdapterOptions {
  map: Map;
}

/**
 * MapLibre adapter implementation. It assumes the host app
 * supplies an offline-capable style (local tiles or images).
 */
export class MapLibreAdapter implements MapAdapter {
  private map: Map;
  private canvas: HTMLCanvasElement | null = null;

  constructor(map: Map) {
    this.map = map;
  }

  attachOverlay(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const container = this.map.getCanvasContainer();
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    container.appendChild(canvas);
  }

  setViewState(state: MapViewState): void {
    this.map.easeTo({
      center: [state.center.lon, state.center.lat],
      zoom: state.zoom,
      bearing: state.bearing ?? 0,
      pitch: state.pitch ?? 0,
      duration: 0,
    });
  }

  destroy(): void {
    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.map.remove();
  }
}

export const createMapLibreAdapter: MapAdapterFactory = {
  create(options, renderer) {
    void renderer;
    const map = (options as MapLibreAdapterOptions).map;
    const adapter = new MapLibreAdapter(map);
    map.on("move", () => {
      options.onViewStateChange?.({
        center: {
          lon: map.getCenter().lng,
          lat: map.getCenter().lat,
        },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });

    return adapter;
  },
};
