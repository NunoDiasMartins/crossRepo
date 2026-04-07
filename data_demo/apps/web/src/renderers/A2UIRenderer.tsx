import type { A2UINode, UIInteractionEvent } from '@demo/shared';

type Props = {
  node: A2UINode;
  onAction: (event: UIInteractionEvent) => void;
};

export const A2UIRenderer = ({ node, onAction }: Props) => {
  if (!node.children) {
    return null;
  }

  return (
    <div className="a2ui-root">
      {node.children.map((child, idx) => {
        if (child.type === 'text') return <p key={idx}>{child.text}</p>;

        if (child.type === 'list') {
          return (
            <ul key={idx}>
              {child.items?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (child.type === 'table') {
          const rows = child.rows ?? [];
          const columns = rows[0] ? Object.keys(rows[0]) : [];
          return (
            <table key={idx}>
              <thead>
                <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {columns.map((col) => <td key={col}>{String(row[col])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

        if (child.type === 'chart') {
          return (
            <div key={idx} className="chart-stack">
              {(child.points ?? []).map((point) => (
                <button
                  key={String(point.week)}
                  className={`chart-point ${point.highlight ? 'highlight' : ''}`}
                  onClick={() => onAction({ type: 'anomaly.selected', payload: { week: String(point.week) } })}
                >
                  {String(point.week)} · ${Number(point.revenue).toLocaleString()}
                </button>
              ))}
            </div>
          );
        }

        if (child.type === 'card') {
          return (
            <div key={idx} className="card">
              <strong>{child.title}</strong>
              <p>{child.text}</p>
            </div>
          );
        }

        if (child.type === 'control-group') {
          return (
            <div key={idx} className="controls">
              {child.controls?.map((control) => {
                if (control.controlType === 'select') {
                  return (
                    <label key={control.id}>
                      {control.label}
                      <select
                        defaultValue={String(control.value ?? 'all')}
                        onChange={(e) =>
                          onAction({
                            type: 'filter.changed',
                            payload:
                              control.id === 'region'
                                ? { region: e.target.value }
                                : control.id === 'channel'
                                  ? { channel: e.target.value }
                                  : { category: e.target.value }
                          })
                        }
                      >
                        {control.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label key={control.id}>
                    {control.label}
                    <input
                      type="range"
                      min={Number(control.min)}
                      max={Number(control.max)}
                      step={Number(control.step)}
                      defaultValue={Number(control.value)}
                      onMouseUp={(e) =>
                        onAction({
                          type: 'filter.changed',
                          payload: { sensitivity: Number((e.target as HTMLInputElement).value) }
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          );
        }

        if (child.type === 'actions') {
          return (
            <div key={idx} className="actions">
              {child.actions?.map((action) => (
                <button key={action.id} onClick={() => onAction(action.event)}>
                  {action.label}
                </button>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
