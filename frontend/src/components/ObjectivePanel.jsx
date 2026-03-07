import MilestoneRow from './MilestoneRow.jsx';

export default function ObjectivePanel({ objective, onClear }) {
  const totalEpics = objective.epics?.length || 0;
  const completedEpics = objective.epics?.filter((e) => e.completed)?.length || 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)',
        borderRadius: 'var(--radius)',
        padding: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--accent)',
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            Active Objective
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
            {objective.name}
          </div>
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
          title="Clear active objective"
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 10,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--text)' }}>{completedEpics}</strong>/{totalEpics} epics done
        </span>
        <span style={{ color: 'var(--text-dim)' }}>ID: {objective.id}</span>
      </div>

      {objective.key_results && objective.key_results.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Milestones
          </div>
          {objective.key_results.slice(0, 5).map((kr, i) => (
            <MilestoneRow key={i} keyResult={kr} />
          ))}
          {objective.key_results.length > 5 && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              +{objective.key_results.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
