export function TopologyView({ title, nodes, edges, blastRadius }: { title: string; nodes: any[]; edges: string[][]; blastRadius: any }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="topology-layout">
        <div className="topology-graph">
          {nodes.map((node) => (
            <div className={`node node-${node.type} ${node.impacted ? 'impacted' : ''}`} key={node.id}>
              {node.label}
            </div>
          ))}
          <div className="edges">{edges.map((edge) => `${edge[0]} → ${edge[1]}`).join(' · ')}</div>
        </div>
        <aside className="blast-radius">
          <h4>Blast Radius</h4>
          <p>Cameras: {blastRadius.impactedCameras}</p>
          <p>gNBs: {blastRadius.impactedGnbs}</p>
          <p>Cells: {blastRadius.impactedCells}</p>
        </aside>
      </div>
    </section>
  );
}
