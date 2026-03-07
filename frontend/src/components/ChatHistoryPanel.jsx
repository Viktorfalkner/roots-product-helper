import { useState, useRef, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection.jsx';
import SidebarButton from './SidebarButton.jsx';

function formatDate(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function IconButton({ onClick, title, color, hoverColor, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        lineHeight: 1,
        fontSize: 13,
        color: hovered ? hoverColor : color,
        transition: 'color 0.15s',
        borderRadius: 'var(--radius-sm)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ChatRow({ chat, isActive, onRestore, onRename, onStar, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setDraft(chat.name);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.name) onRename(chat.id, trimmed);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false); }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '5px 0',
        paddingLeft: isActive ? 6 : 0,
        gap: 8,
        borderLeft: isActive ? '2px solid var(--accent)' : 'none',
        marginLeft: isActive ? -8 : 0,
      }}
    >
      {/* Star */}
      <IconButton
        onClick={() => onStar(chat.id)}
        title={chat.starred ? 'Unfavorite' : 'Favorite'}
        color={chat.starred ? '#f5a623' : 'var(--text-dim)'}
        hoverColor={chat.starred ? '#d4881a' : '#f5a623'}
      >
        {chat.starred ? '★' : '☆'}
      </IconButton>

      {/* Name + date */}
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
              color: 'var(--text)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            title={chat.name}
            style={{
              fontSize: 12,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: isActive ? 500 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {chat.name}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
          {formatDate(chat.updatedAt)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
        {confirming ? (
          <>
            <SidebarButton size="sm" variant="danger" onClick={() => onDelete(chat.id)}>
              Delete
            </SidebarButton>
            <SidebarButton size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </SidebarButton>
          </>
        ) : (
          <>
            {!isActive && (
              <SidebarButton size="sm" onClick={() => onRestore(chat.id)} title="Restore this chat">
                Restore
              </SidebarButton>
            )}
            <IconButton onClick={startEdit} title="Rename" color="var(--text-dim)" hoverColor="var(--text)">
              ✎
            </IconButton>
            <IconButton onClick={() => setConfirming(true)} title="Delete" color="var(--text-dim)" hoverColor="var(--red)">
              ✕
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatHistoryPanel({ chats, currentChatId, onRestore, onRename, onStar, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  if (chats.length === 0) return null;

  const badge = (
    <span style={{
      marginLeft: 'auto',
      background: 'var(--bg-elevated)',
      color: 'var(--text-dim)',
      borderRadius: 3,
      padding: '1px 5px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0,
      textTransform: 'none',
    }}>
      {chats.length}
    </span>
  );

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
      <CollapsibleSection
        title="Chat History"
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        badge={badge}
      >
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
      </CollapsibleSection>
    </div>
  );
}
