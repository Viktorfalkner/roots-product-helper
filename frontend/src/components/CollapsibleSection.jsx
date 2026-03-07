export default function CollapsibleSection({ title, expanded, onToggle, badge, active, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          color: active ? 'var(--text-muted)' : 'var(--text-dim)',
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
        {title}
        {badge}
      </button>
      {expanded && children}
    </div>
  );
}
