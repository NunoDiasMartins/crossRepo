function TreeNode({ node }: { node: any }) {
  return (
    <li>
      <span>{node.node}</span>
      {node.children ? (
        <ul>
          {node.children.map((child: any) => (
            <TreeNode key={child.node} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function RcaPanel({ title, confidence, rootCause, tree, propagation }: { title: string; confidence: number; rootCause: string; tree: any; propagation: string }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <p className="rca-headline">Root cause: {rootCause}</p>
      <p>Confidence: {(confidence * 100).toFixed(0)}%</p>
      <ul className="fault-tree">
        <TreeNode node={tree} />
      </ul>
      <p>{propagation}</p>
    </section>
  );
}
