import "./style.css";
import { type AlarmSeverity, type TileLayerConfig, type TopologyAlarm, type TopologyGraph } from "@assurance-topology/topology-core";
import "@assurance-topology/topology-webcomponent";
import type { CompanyTopologyMapElement } from "@assurance-topology/topology-webcomponent";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing app container");

app.innerHTML = `
  <div class="map-area">
    <company-topology-map></company-topology-map>
  </div>
  <aside class="panel">
    <h3>Topology Sample App</h3>
    <p>Leaflet + OpenStreetMap read-only topology with alarm overlays.</p>
    <div class="controls" id="controls"></div>
    <h4>Alarm Severity Legend</h4>
    <div class="legend">
      <div><span class="dot" style="background:#dc2626"></span>critical</div>
      <div><span class="dot" style="background:#ea580c"></span>major</div>
      <div><span class="dot" style="background:#f59e0b"></span>minor</div>
      <div><span class="dot" style="background:#eab308"></span>warning</div>
      <div><span class="dot" style="background:#16a34a"></span>cleared</div>
    </div>
    <h4>Event log</h4>
    <div id="log" class="log"></div>
  </aside>
`;

const mapEl = app.querySelector<CompanyTopologyMapElement>("company-topology-map");
const controls = app.querySelector<HTMLDivElement>("#controls");
const log = app.querySelector<HTMLDivElement>("#log");
if (!mapEl || !controls || !log) throw new Error("Missing UI refs");

const graph: TopologyGraph = {
  nodes: [
    { id: "nyc", type: "core", label: "New York", coordinates: { lat: 40.7128, lng: -74.006 } },
    { id: "bos", type: "metro", label: "Boston", coordinates: { lat: 42.3601, lng: -71.0589 } },
    { id: "phl", type: "metro", label: "Philadelphia", coordinates: { lat: 39.9526, lng: -75.1652 } },
    { id: "dc", type: "core", label: "Washington DC", coordinates: { lat: 38.9072, lng: -77.0369 } },
    { id: "chi", type: "core", label: "Chicago", coordinates: { lat: 41.8781, lng: -87.6298 } },
    { id: "atl", type: "metro", label: "Atlanta", coordinates: { lat: 33.749, lng: -84.388 } },
    { id: "mia", type: "metro", label: "Miami", coordinates: { lat: 25.7617, lng: -80.1918 } },
    { id: "dal", type: "metro", label: "Dallas", coordinates: { lat: 32.7767, lng: -96.797 } },
  ],
  edges: [
    { id: "e1", source: "nyc", target: "bos", type: "fiber" },
    { id: "e2", source: "nyc", target: "phl", type: "fiber" },
    { id: "e3", source: "phl", target: "dc", type: "fiber" },
    { id: "e4", source: "dc", target: "atl", type: "fiber" },
    { id: "e5", source: "atl", target: "mia", type: "fiber" },
    { id: "e6", source: "chi", target: "dal", type: "fiber" },
    { id: "e7", source: "chi", target: "nyc", type: "backbone" },
  ],
};

const alarms: TopologyAlarm[] = [
  { id: "a1", entityType: "node", entityId: "nyc", severity: "critical", count: 3, label: "Core outage" },
  { id: "a2", entityType: "node", entityId: "dc", severity: "major", count: 1, label: "Power issue" },
  { id: "a3", entityType: "node", entityId: "mia", severity: "minor", count: 2, label: "Packet loss" },
  { id: "a4", entityType: "edge", entityId: "e7", severity: "warning", count: 1, label: "Latency high" },
  { id: "a5", entityType: "node", entityId: "bos", severity: "cleared", count: 1, label: "Recovered" },
];

const tileLayerConfig: TileLayerConfig = {
  urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
  subdomains: ["a", "b", "c"],
};

mapEl.tileLayerConfig = tileLayerConfig;
mapEl.setGraph(graph);
mapEl.setAlarms(alarms);

const severities: AlarmSeverity[] = ["critical", "major", "minor", "warning", "cleared"];
const active = new Set<AlarmSeverity>(severities);

const fitBtn = document.createElement("button");
fitBtn.textContent = "Fit to view";
fitBtn.onclick = () => mapEl.fitToView();
controls.appendChild(fitBtn);

severities.forEach((severity) => {
  const button = document.createElement("button");
  button.textContent = severity;
  button.onclick = () => {
    if (active.has(severity)) active.delete(severity); else active.add(severity);
    mapEl.setFilters({ severities: [...active] });
  };
  controls.appendChild(button);
});

const alarmToggle = document.createElement("button");
alarmToggle.textContent = "Toggle alarms";
let alarmsVisible = true;
alarmToggle.onclick = () => {
  alarmsVisible = !alarmsVisible;
  mapEl.setAlarms(alarmsVisible ? alarms : []);
};
controls.appendChild(alarmToggle);

mapEl.addEventListener("node-selected", (event) => appendLog(`node-selected: ${(event as CustomEvent<{ nodeId: string }>).detail.nodeId}`));
mapEl.addEventListener("edge-selected", (event) => appendLog(`edge-selected: ${(event as CustomEvent<{ edgeId: string }>).detail.edgeId}`));
mapEl.addEventListener("alarm-selected", (event) => appendLog(`alarm-selected: ${(event as CustomEvent<{ alarm: TopologyAlarm }>).detail.alarm.id}`));
mapEl.addEventListener("map-ready", () => mapEl.fitToView());

function appendLog(message: string): void {
  const time = new Date().toISOString();
  log.textContent = `${time} ${message}\n${log.textContent}`.trim();
}
