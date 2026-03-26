import type { TopologyAlarm, TopologyGraph } from "@assurance-topology/topology-types";

export interface TopologyPluginContext {
  getGraph: () => TopologyGraph;
  getAlarms: () => TopologyAlarm[];
  invalidate: () => void;
}

export interface TopologyPlugin {
  id: string;
  init(context: TopologyPluginContext): void;
  dispose(): void;
}

export function readonlyPlugin(): TopologyPlugin {
  return {
    id: "readonly",
    init: () => undefined,
    dispose: () => undefined,
  };
}

export function alarmOverlayPlugin(): TopologyPlugin {
  return {
    id: "alarm-overlay",
    init: () => undefined,
    dispose: () => undefined,
  };
}

export function registerPlugins(plugins: TopologyPlugin[], context: TopologyPluginContext): () => void {
  plugins.forEach((plugin) => plugin.init(context));
  return () => {
    [...plugins].reverse().forEach((plugin) => plugin.dispose());
  };
}
