import { useState, useRef, useEffect } from 'react';

function formatDate(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChatRow({ chat, isActive, onRestore, onRename, onStar, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(chat.name);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.name) onRename(chat.id, trimmed);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 0 5px 6px',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        marginLeft: isActive ? -2 : 0,
      }}
    >
      {/* Star */}
      <button
        onClick={() => onStar(chat.id)}
        title={chat.starred ? 'Unstar' : 'Star'}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 2px',
          cursor: 'pointer',
          fontSize: 13,
          lineHeight: 1,
          flexShrink: 0,
          color: chat.starred ? '#f5a623' : 'var(--text-dim)',
          opacity: chat.starred || hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        {chat.starred ? '★' : '☆'}
      </button>

      {/* Name / edit */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            onClick={startEdit}
            title={chat.name}
            style={{
              fontSize: 12,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: isActive ? 500 : 400,
              cursor: 'text',
            }}
          >
            {chat.name}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
          {formatDate(chat.updatedAt)}
        </div>
      </div>

      {!isActive && (
        <button
          onClick={() => onRestore(chat.id)}
          title="Restore this chat"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-dim)',
            fontSize: 10,
            padding: '2px 6px',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Restore
        </button>
      )}
      <button
        onClick={() => onDelete(chat.id)}
        title="Delete"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: 14,
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function ChatHistoryPanel({ chats, currentChatId, onRestore, onRename, onStar, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  if (chats.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
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
        Chat History
        <span
          style={{
            marginLeft: 'auto',
            background: 'var(--bg-elevated)',
            color: 'var(--text-dim)',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: 'none',
          }}
        >
          {chats.length}
        </span>
      </button>

      {expanded && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {chats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              isActive={chat.id === currentChatId}
              onRestore={onRestore}
              onRename={onRename}
              onStar={onStar}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
