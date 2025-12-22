import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { AssuranceTopologyElement } from "@assurance-topology/wc";
import { type GraphSnapshot } from "@assurance-topology/core";
import { createMapLibreAdapter } from "@assurance-topology/map-adapter";
import { Map } from "maplibre-gl";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error("App container not found");
}

const topologyElement = new AssuranceTopologyElement();
topologyElement.style.position = "absolute";
topologyElement.style.inset = "0";

container.appendChild(topologyElement);

const panel = document.createElement("div");
panel.className = "panel";
panel.innerHTML = \`
  <strong>Assurance Topology Demo</strong><br />
  Nodes: 5,000 • Edges: 8,000<br />
  Click a node to emit interaction events.\n\`;
container.appendChild(panel);

const map = new Map({
  container: topologyElement.getMapContainer(),
  style: "/map-style.json",
  center: [0, 20],
  zoom: 1.4,
  attributionControl: false,
});

const adapter = createMapLibreAdapter.create(
  {
    container: topologyElement.getMapContainer(),
    map,
  },
  topologyElement.getRenderer()
);

topologyElement.attachMapAdapter(adapter);

const graph = buildDemoGraph(5000, 8000);
topologyElement.setGraph(graph);

topologyElement.addEventListener("assurance-interaction", (event) => {
  const detail = (event as CustomEvent).detail as { type: string; nodeId?: string };
  if (detail.type === "node-selected" && detail.nodeId) {
    console.log(`Node selected: ${detail.nodeId}`);
  }
});

function buildDemoGraph(nodeCount: number, edgeCount: number): GraphSnapshot {
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const lon = -180 + (index % 360);
    const lat = -60 + ((index * 7) % 120);
    return {
      id: `node-${index}`,
      label: `Site ${index}`,
      position: { lon, lat },
      metadata: {
        siteType: index % 5 === 0 ? "core" : "access",
      },
    };
  });

  const edges = Array.from({ length: edgeCount }, (_, index) => {
    const from = nodes[index % nodes.length];
    const to = nodes[(index * 7) % nodes.length];
    return {
      id: `edge-${index}`,
      from: from.id,
      to: to.id,
      path: [
        { lon: from.position.lon, lat: from.position.lat },
        {
          lon: (from.position.lon + to.position.lon) / 2 + 2,
          lat: (from.position.lat + to.position.lat) / 2 + 1,
        },
        { lon: to.position.lon, lat: to.position.lat },
      ],
      metadata: {
        capacity: 10 + (index % 100),
      },
    };
  });

  return {
    nodes,
    edges,
    overlays: [],
  };
}
