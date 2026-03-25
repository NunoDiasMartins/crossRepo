import { beforeEach, describe, expect, it, vi } from "vitest";

const renderMock = {
  setGraph: vi.fn(),
  setAlarms: vi.fn(),
  setSelection: vi.fn(),
  focusNode: vi.fn(),
  focusEdge: vi.fn(),
  fitToView: vi.fn(),
  setFilter: vi.fn(),
  destroy: vi.fn(),
  getMap: vi.fn(() => ({ getCenter: () => ({ lat: 0, lng: 0 }), getZoom: () => 1 })),
};

const rendererCtor = vi.fn(() => renderMock);
vi.mock("@assurance-topology/topology-leaflet-renderer", () => ({
  TopologyLeafletRenderer: rendererCtor,
}));

const registerPluginsMock = vi.fn(() => vi.fn());
vi.mock("@assurance-topology/topology-plugins", async () => {
  const actual = await vi.importActual<object>("@assurance-topology/topology-plugins");
  return {
    ...actual,
    registerPlugins: registerPluginsMock,
  };
});

import { CompanyTopologyMapElement } from "./index";

describe("CompanyTopologyMapElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("initializes and emits map-ready", () => {
    const element = new CompanyTopologyMapElement();
    const onReady = vi.fn();
    element.addEventListener("map-ready", onReady);
    document.body.appendChild(element);
    expect(onReady).toHaveBeenCalled();
  });

  it("emits node-selected event", () => {
    const element = new CompanyTopologyMapElement();
    const onNode = vi.fn();
    element.addEventListener("node-selected", onNode);
    document.body.appendChild(element);

    const opts = rendererCtor.mock.calls[0][0];
    opts.onNodeClick({ id: "node-a", type: "site", label: "A", coordinates: { lat: 0, lng: 0 } });
    expect(onNode).toHaveBeenCalledWith(expect.objectContaining({ detail: { nodeId: "node-a" } }));
  });

  it("emits alarm-selected event", () => {
    const element = new CompanyTopologyMapElement();
    const onAlarm = vi.fn();
    element.addEventListener("alarm-selected", onAlarm);
    document.body.appendChild(element);

    const opts = rendererCtor.mock.calls[0][0];
    const alarm = { id: "a1", entityType: "node" as const, entityId: "n1", severity: "critical" as const };
    opts.onAlarmClick(alarm);
    expect(onAlarm).toHaveBeenCalledWith(expect.objectContaining({ detail: { alarm } }));
  });

  it("applies filters and fit-to-view", () => {
    const element = new CompanyTopologyMapElement();
    document.body.appendChild(element);

    element.setFilters({ severities: ["major"] });
    element.fitToView();

    expect(renderMock.setFilter).toHaveBeenCalledWith({ severities: ["major"] });
    expect(renderMock.fitToView).toHaveBeenCalled();
  });

  it("registers plugins", () => {
    const element = new CompanyTopologyMapElement();
    document.body.appendChild(element);
    expect(registerPluginsMock).toHaveBeenCalled();
  });
});
