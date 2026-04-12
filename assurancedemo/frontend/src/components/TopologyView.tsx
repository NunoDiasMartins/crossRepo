import { useMemo, useState } from 'react';

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

type PositionedNode = TopologyNode & { x: number; y: number };

const WIDTH = 720;
const HEIGHT = 340;
const NODE_RADIUS = 18;

function makeNodePositions(inputNodes: TopologyNode[]): PositionedNode[] {
  if (!inputNodes.length) return [];

  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;

  const rootNodes = inputNodes.filter((node) => node.rootCause);
  const impactedNodes = inputNodes.filter((node) => node.impacted && !node.rootCause);
  const otherNodes = inputNodes.filter((node) => !node.impacted && !node.rootCause);

  const positioned: PositionedNode[] = [];

  rootNodes.forEach((node, index) => {
    const offset = (index - (rootNodes.length - 1) / 2) * 70;
    positioned.push({ ...node, x: centerX + offset, y: centerY });
  });

  impactedNodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(impactedNodes.length, 1);
    const orbit = 105 + (index % 2) * 16;
    positioned.push({
      ...node,
      x: centerX + Math.cos(angle) * orbit,
      y: centerY + Math.sin(angle) * orbit
    });
  });

  otherNodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(otherNodes.length, 1);
    const orbit = 155 + (index % 3) * 20;
    positioned.push({
      ...node,
      x: centerX + Math.cos(angle + 0.5) * orbit,
      y: centerY + Math.sin(angle + 0.5) * orbit
    });
  });

  return positioned;
}

function nodeClassName(node: TopologyNode): string {
  return ['topology-node', `topology-node-${node.type}`, node.impacted ? 'impacted' : '', node.rootCause ? 'root-cause' : '', node.causal ? 'causal' : '']
    .filter(Boolean)
    .join(' ');
}

function linePath(source: PositionedNode, target: PositionedNode): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const midX = source.x + dx / 2;
  const midY = source.y + dy / 2 - 24;
  return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
}

function blastOverlay(nodes: PositionedNode[], mode: 'impact' | 'rca') {
  const influenced = nodes.filter((node) => node.impacted || node.rootCause || node.causal);
  if (!influenced.length) return null;

  const cx = influenced.reduce((sum, node) => sum + node.x, 0) / influenced.length;
  const cy = influenced.reduce((sum, node) => sum + node.y, 0) / influenced.length;
  const maxDistance = influenced.reduce((max, node) => Math.max(max, Math.hypot(node.x - cx, node.y - cy)), 0);

  const base = Math.max(70, maxDistance + 28);
  const pulse = mode === 'rca' ? 26 : 16;

  return (
    <g className="blast-overlay" aria-hidden="true">
      <circle cx={cx} cy={cy} r={base + pulse} className="blast-halo outer" />
      <circle cx={cx} cy={cy} r={base} className="blast-halo mid" />
      <circle cx={cx} cy={cy} r={Math.max(45, base - 22)} className="blast-halo inner" />
    </g>
  );
}

export function TopologyView({ title, nodes, edges, blastRadius, mode = 'impact', rcaDetails }: TopologyProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const positionedNodes = useMemo(() => makeNodePositions(nodes), [nodes]);
  const nodeById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const hoveredNode = hoveredNodeId ? nodeById.get(hoveredNodeId) ?? null : null;
  const tooltipNode = hoveredNode ?? selectedNode;

  const connectionSet = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>([selectedNodeId]);
    edges.forEach(([source, target]) => {
      if (source === selectedNodeId || target === selectedNodeId) {
        connected.add(source);
        connected.add(target);
      }
    });
    return connected;
  }, [selectedNodeId, edges]);

  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="topology-layout">
        <div className="topology-canvas-card">
          <svg className="topology-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Interactive service topology" onClick={() => setSelectedNodeId(null)}>
            <defs>
              <linearGradient id="topology-bg" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#0c1f3d" />
                <stop offset="100%" stopColor="#070f22" />
              </linearGradient>
              <radialGradient id="impact-glow" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="rgba(255,101,140,0.3)" />
                <stop offset="100%" stopColor="rgba(255,101,140,0)" />
              </radialGradient>
            </defs>

            <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="12" className="topology-backdrop" fill="url(#topology-bg)" />
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="12" className="topology-grid" />

            {blastOverlay(positionedNodes, mode)}

            <g className="topology-links">
              {edges.map(([sourceId, targetId]) => {
                const source = nodeById.get(sourceId);
                const target = nodeById.get(targetId);
                if (!source || !target) return null;
                const selectedPath = !!selectedNodeId && (sourceId === selectedNodeId || targetId === selectedNodeId);
                const dimmed = !!selectedNodeId && !selectedPath;

                return <path key={`${sourceId}-${targetId}`} d={linePath(source, target)} className={`topology-link ${selectedPath ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`} />;
              })}
            </g>

            <g className="topology-nodes">
              {positionedNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isDimmed = connectionSet.size > 0 && !connectionSet.has(node.id);

                return (
                  <g
                    key={node.id}
                    className={`${nodeClassName(node)} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setSelectedNodeId((current) => (current === node.id ? null : node.id));
                    }}
                  >
                    <circle r={NODE_RADIUS + 9} className="node-glow" fill="url(#impact-glow)" />
                    <circle r={NODE_RADIUS} className="node-core" />
                    <text className="node-label" y={NODE_RADIUS + 16} textAnchor="middle">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {tooltipNode ? (
            <div className="topology-tooltip" style={{ left: `${Math.min(tooltipNode.x + 24, WIDTH - 205)}px`, top: `${Math.max(tooltipNode.y - 76, 10)}px` }}>
              <strong>{tooltipNode.label}</strong>
              <p>Type: {tooltipNode.type}</p>
              <p>Status: {tooltipNode.rootCause ? 'Root cause' : tooltipNode.impacted ? 'Impacted' : 'Healthy'}</p>
              <p>
                Connected edges:{' '}
                {edges.filter(([sourceId, targetId]) => sourceId === tooltipNode.id || targetId === tooltipNode.id).length}
              </p>
            </div>
          ) : null}
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
