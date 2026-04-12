type TopologyNode = {
  id: string;
  label: string;
  type: string;
  impacted?: boolean;
  rootCause?: boolean;
  causal?: boolean;
};

type TopologyProps = {
  title: string;
  mode?: 'impact' | 'rca';
  nodes: TopologyNode[];
  edges: string[][];
  blastRadius?: {
    impactedCameras: number;
    impactedGnbs: number;
    impactedCells: number;
  };
  rcaDetails?: {
    confidence: number;
    rootCause: string;
    propagation: string;
    causalPath: string[];
  };
};

export function TopologyView({ title, nodes, edges, blastRadius, mode = 'impact', rcaDetails }: TopologyProps) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="topology-layout">
        <div className="topology-graph">
          {nodes.map((node) => (
            <div
              className={`node node-${node.type} ${node.impacted ? 'impacted' : ''} ${node.rootCause ? 'root-cause' : ''} ${node.causal ? 'causal' : ''}`}
              key={node.id}
            >
              {node.label}
            </div>
          ))}
          <div className="edges">{edges.map((edge) => `${edge[0]} → ${edge[1]}`).join(' · ')}</div>
        </div>
        {mode === 'rca' && rcaDetails ? (
          <aside className="blast-radius">
            <h4>RCA Overlay</h4>
            <p>Root Cause: {rcaDetails.rootCause}</p>
            <p>Confidence: {(rcaDetails.confidence * 100).toFixed(0)}%</p>
            <p>{rcaDetails.propagation}</p>
            <p>Causal path: {rcaDetails.causalPath.join(' → ')}</p>
          </aside>
        ) : (
          <aside className="blast-radius">
            <h4>Blast Radius</h4>
            <p>Cameras: {blastRadius?.impactedCameras ?? 0}</p>
            <p>gNBs: {blastRadius?.impactedGnbs ?? 0}</p>
            <p>Cells: {blastRadius?.impactedCells ?? 0}</p>
          </aside>
        )}
      </div>
    </section>
  );
}
