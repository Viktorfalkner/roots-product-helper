import { useState, useEffect } from 'react';
import SidebarButton from './SidebarButton.jsx';

export default function ReferenceLibrary() {
  const [config, setConfig] = useState(null);
  const [addInput, setAddInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/reference-library')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  async function handleAdd() {
    const id = parseInt(addInput.trim(), 10);
    if (isNaN(id)) return;
    setAdding(true);
    try {
      const res = await fetch('/api/reference-library/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective_id: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setAddInput('');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id) {
    const res = await fetch('/api/reference-library/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective_id: id }),
    });
    const data = await res.json();
    if (data.ok) setConfig(data.config);
  }

  if (!config) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 0,
          width: '100%',
          marginBottom: expanded ? 8 : 0,
        }}
      >
        <span style={{ color: 'var(--text-dim)' }}>{expanded ? '▾' : '▸'}</span>
        Reference Library ({config.reference_objective_ids?.length || 0})
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }}>
          {(config.references || config.reference_objective_ids?.map((id) => ({ id, name: null })) || []).map(({ id, name }) => (
            <div
              key={id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '5px 0',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name || `Objective #${id}`}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>#{id}</div>
              </div>
              <SidebarButton onClick={() => handleRemove(id)} size="sm" style={{ flexShrink: 0 }}>
                Remove
              </SidebarButton>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Objective ID"
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
                fontSize: 12,
                padding: '4px 8px',
                outline: 'none',
              }}
            />
            <SidebarButton onClick={handleAdd} disabled={adding || !addInput.trim()}>
              {adding ? '...' : 'Add'}
            </SidebarButton>
          </div>
        </div>
      )}
    </div>
  );
}
