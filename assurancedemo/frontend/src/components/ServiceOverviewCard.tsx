export function ServiceOverviewCard({ title, serviceName, metrics, sparkline }: { title: string; serviceName: string; metrics: any; sparkline: number[] }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <h3>{serviceName}</h3>
      <div className="metric-grid">
        <div><span>SLA compliance</span><strong>{metrics.slaCompliance}%</strong></div>
        <div><span>Latency P95</span><strong>{metrics.latencyP95} ms</strong></div>
        <div><span>Active alarms</span><strong>{metrics.activeAlarms}</strong></div>
        <div><span>Impacted endpoints</span><strong>{metrics.impactedEndpoints}</strong></div>
      </div>
      <div className="sparkline">
        {sparkline.map((value, i) => (
          <span key={i} style={{ height: `${value}%` }} />
        ))}
      </div>
    </section>
  );
}
