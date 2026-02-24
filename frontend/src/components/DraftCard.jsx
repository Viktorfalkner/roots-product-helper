import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DRAFT_TYPES = {
  'draft:story': 'Story',
  'draft:epic': 'Epic',
  'draft:objective': 'Objective',
  'draft:prd': 'PRD',
  'draft:milestone': 'Milestone',
};

const SHORTCUT_ENDPOINTS = {
  'draft:story': '/api/create/story',
  'draft:epic': '/api/create/epic',
  'draft:milestone': '/api/create/milestone',
};

function extractTitle(content) {
  const match = content.match(/^#+\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function parseDraftContent(content) {
  return content.replace(/<!--\s*draft:[a-z]+\s*-->\s*/g, '').trim();
}

function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DraftCard({ draftType, content, activeObjective, onSendMessage }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const typeLabel = DRAFT_TYPES[draftType] || 'Draft';
  const cleanContent = parseDraftContent(content);
  const title = extractTitle(cleanContent) || `Untitled ${typeLabel}`;

  const isPrd = draftType === 'draft:prd';
  const isObjective = draftType === 'draft:objective';
  const hasShortcutCreate = SHORTCUT_ENDPOINTS[draftType] != null;

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const payload = { name: title, description: cleanContent };

      if (draftType === 'draft:story' && activeObjective) {
        const firstEpic = activeObjective.epics?.find((e) => !e.completed);
        if (firstEpic) payload.epic_id = firstEpic.id;
      }
      if (draftType === 'draft:epic' && activeObjective) {
        payload.objective_id = activeObjective.id;
      }
      if (draftType === 'draft:milestone') {
        if (!activeObjective) {
          setError('Load an objective first to create milestones');
          setCreating(false);
          return;
        }
        payload.objective_id = activeObjective.id;
      }

      const res = await fetch(SHORTCUT_ENDPOINTS[draftType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setCreated(data.story || data.epic || data.objective || data.key_result);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleCreatePrd() {
    if (!onSendMessage) return;
    const prompt = `Create a PRD for the following objective. Use the PRD template exactly, filling every section with as much concrete detail as the objective provides. Surface anything ambiguous as an Open Question rather than guessing.\n\n---\n\n${cleanContent}`;
    onSendMessage(prompt);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    downloadMarkdown(`${slug}.md`, cleanContent);
  }

  const typeColors = {
    'draft:story': 'var(--blue)',
    'draft:epic': 'var(--amber)',
    'draft:objective': 'var(--accent)',
    'draft:prd': '#a78bfa',
    'draft:milestone': '#2dd4bf',
  };
  const typeColor = typeColors[draftType] || 'var(--text-muted)';

  return (
    <div
      style={{
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${typeColor}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: typeColor,
              background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
              padding: '2px 6px',
              borderRadius: 3,
              flexShrink: 0,
            }}
          >
            {typeLabel} Draft
          </span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={handleCopy} style={ghostBtn()}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>

          {isPrd && (
            <button onClick={handleDownload} style={ghostBtn()}>
              Download
            </button>
          )}

{hasShortcutCreate && !created && (
            <button onClick={handleCreate} disabled={creating} style={primaryBtn(typeColor)}>
              {creating ? 'Creating...' : draftType === 'draft:milestone' ? 'Add to Objective' : 'Create in Shortcut'}
            </button>
          )}

          {created && (
            <span style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ Created (ID: {created.id})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          maxHeight: 480,
          overflowY: 'auto',
        }}
      >
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--red-bg)',
            borderTop: '1px solid var(--border)',
            color: 'var(--red)',
            fontSize: 12,
          }}
        >
          Error: {error}
        </div>
      )}
    </div>
  );
}

function ghostBtn() {
  return {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: 12,
    padding: '4px 10px',
    cursor: 'pointer',
  };
}

function primaryBtn(color) {
  return {
    background: color,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    cursor: 'pointer',
  };
}
