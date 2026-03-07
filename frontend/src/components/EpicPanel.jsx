export default function EpicPanel({ epic, onClear }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 'var(--radius)',
        padding: '8px 12px',
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--amber)',
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            Active Epic
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
            {epic.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>ID: {epic.id}</div>
        </div>
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: 16,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
          }}
          title="Clear active epic"
        >
          ×
        </button>
      </div>
    </div>
  );
}
