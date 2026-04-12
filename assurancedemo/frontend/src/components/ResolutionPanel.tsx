export function ResolutionPanel({ title, beforeAfter, recoveredDevices, timeline }: { title: string; beforeAfter: any; recoveredDevices: number; timeline: string[] }) {
  return (
    <section className="surface-card">
      <h2>{title}</h2>
      <div className="before-after-grid">
        <div><span>Latency P95</span><strong>{beforeAfter.latencyP95.before} → {beforeAfter.latencyP95.after} ms</strong></div>
        <div><span>SLA</span><strong>{beforeAfter.slaCompliance.before}% → {beforeAfter.slaCompliance.after}%</strong></div>
        <div><span>Drop Rate</span><strong>{beforeAfter.dropRate.before}% → {beforeAfter.dropRate.after}%</strong></div>
        <div><span>Packet Loss</span><strong>{beforeAfter.packetLoss.before}% → {beforeAfter.packetLoss.after}%</strong></div>
      </div>
      <div className="improved-kpi-strip">
        <p>Improved after fix:</p>
        <span>Drop rate recovered to {beforeAfter.dropRate.after}%</span>
        <span>Packet loss recovered to {beforeAfter.packetLoss.after}%</span>
      </div>
      <p>Recovered impacted devices: {recoveredDevices}</p>
      <ol>
        {timeline.map((entry, idx) => <li key={idx}>{entry}</li>)}
      </ol>
    </section>
  );
}
