import SidebarButton from './SidebarButton.jsx';

export default function RepoPicker({ repos, loading, error, search, onSearch, onSelect, onClose, alreadyLoaded, starred, onToggleStar }) {
  const filtered = repos
    ? repos
        .filter((r) => {
          const q = search.toLowerCase();
          return r.full_name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
          const aStarred = starred.includes(a.full_name) ? 0 : 1;
          const bStarred = starred.includes(b.full_name) ? 0 : 1;
          return aStarred - bStarred;
        })
    : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          width: 480,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Select a repository</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search repositories..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: 13,
              padding: '6px 10px',
              outline: 'none',
            }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Loading repos...</div>
          )}
          {error && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No repositories found</div>
          )}
          {filtered.map((r, i) => {
            const loaded = alreadyLoaded.some((x) => x.owner === r.owner && x.repo === r.repo);
            const isStarred = starred.includes(r.full_name);
            const prevStarred = i > 0 && starred.includes(filtered[i - 1].full_name);
            const showDivider = !isStarred && prevStarred && starred.length > 0 && !search;
            return (
              <div key={r.full_name}>
                {showDivider && (
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                )}
                <div
                  onClick={() => !loaded && onSelect(r.owner, r.repo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: loaded ? 'default' : 'pointer',
                    opacity: loaded ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loaded) e.currentTarget.style.background = 'var(--bg-hover, var(--bg))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleStar(r.full_name); }}
                    title={isStarred ? 'Unstar' : 'Star'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: 14,
                      lineHeight: 1,
                      color: isStarred ? '#f5c518' : 'var(--text-dim)',
                      flexShrink: 0,
                    }}
                  >
                    {isStarred ? '★' : '☆'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{r.full_name}</div>
                    {r.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                    )}
                  </div>
                  {r.private && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>private</span>
                  )}
                  {loaded && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 3, padding: '1px 5px', flexShrink: 0, fontWeight: 600 }}>loaded</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
