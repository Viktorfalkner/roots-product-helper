import { useState } from 'react';
import SidebarButton from './SidebarButton.jsx';

export default function ContextBadge({ status, onRefresh, onClear }) {
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
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return '0m';
  }

  const isGood = status?.exists && !status?.is_stale;
  const isAmber = status?.exists && status?.is_stale;
  const isRed = !status?.exists;

  const dotColor = isGood ? 'var(--accent)' : isAmber ? 'var(--amber)' : 'var(--red)';
  const label = isRed ? 'No cache' : isAmber ? 'Stale' : 'Fresh';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <SidebarButton
          variant="danger"
          size="sm"
          onClick={onClear}
          title="Clear all loaded context — objective, epic, repos, Figma links, transcripts, and PRD. Chat messages are kept."
        >
          Clear
        </SidebarButton>
        <SidebarButton
          variant="primary"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Re-fetch team context from Shortcut and refresh the active objective."
          style={{ minWidth: 58, textAlign: 'center' }}
        >
          {refreshing ? 'Reloading…' : 'Reload'}
        </SidebarButton>
      </div>
    </div>
  );
}
