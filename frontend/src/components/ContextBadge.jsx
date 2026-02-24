import { useState } from 'react';

export default function ContextBadge({ status, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  function formatAge(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'just now';
  }

  const isGood = status?.exists && !status?.is_stale;
  const isAmber = status?.exists && status?.is_stale;
  const isRed = !status?.exists;

  const dotColor = isGood ? 'var(--accent)' : isAmber ? 'var(--amber)' : 'var(--red)';
  const label = isRed
    ? 'No cache'
    : isAmber
    ? 'Stale'
    : 'Fresh';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: isGood ? `0 0 6px ${dotColor}` : 'none',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {label}
          {status?.refreshed_at && (
            <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>
              · {formatAge(status.refreshed_at)}
            </span>
          )}
        </span>
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: refreshing ? 'var(--text-dim)' : 'var(--text-muted)',
          fontSize: 11,
          padding: '2px 8px',
          cursor: refreshing ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!refreshing) e.target.style.borderColor = 'var(--text-dim)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = 'var(--border)';
        }}
      >
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
