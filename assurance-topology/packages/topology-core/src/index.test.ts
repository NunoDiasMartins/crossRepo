import { describe, expect, it } from "vitest";
import type { TopologyGraph } from "@assurance-topology/topology-types";
import { computeGraphBounds, filterAlarms } from "./index";

describe("topology type exports", () => {
  it("supports canonical topology graph typing", () => {
    const graph: TopologyGraph = {
      nodes: [{ id: "n1", type: "site", label: "Site", coordinates: { lat: 1, lng: 2 } }],
      edges: [],
    };
    expect(graph.nodes[0].coordinates.lat).toBe(1);
  });
});

describe("core utilities", () => {
  it("filters alarms by severity", () => {
    const alarms = [
      { id: "a1", entityType: "node", entityId: "n1", severity: "critical" as const },
      { id: "a2", entityType: "node", entityId: "n2", severity: "minor" as const },
    ];
    expect(filterAlarms(alarms, { severities: ["critical"] })).toHaveLength(1);
  });

  it("computes fit bounds", () => {
    const bounds = computeGraphBounds({
      nodes: [
        { id: "n1", type: "site", label: "A", coordinates: { lat: 10, lng: 20 } },
        { id: "n2", type: "site", label: "B", coordinates: { lat: 15, lng: 30 } },
      ],
      edges: [],
    });
    expect(bounds).toEqual([[10, 20], [15, 30]]);
  });
});
