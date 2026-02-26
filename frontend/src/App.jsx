import { useState, useEffect, useRef } from 'react';
import Chat from './components/Chat.jsx';
import ContextBadge from './components/ContextBadge.jsx';

function parseObjectiveId(input) {
  const trimmed = input.trim();
  // Shortcut URL: https://app.shortcut.com/.../objective/12345/...
  const urlMatch = trimmed.match(/objectives?\/(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  // Plain number
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  return null;
}

function parseRepoInput(input) {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  const parts = trimmed.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
  return null;
}

function MilestoneRow({ keyResult }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--text-dim)',
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {keyResult.name || keyResult.type}
      </span>
    </div>
  );
}

function ObjectivePanel({ objective, onClear }) {
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
          <strong style={{ color: 'var(--text)' }}>{completedEpics}</strong>/{totalEpics} epics
          done
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

function EpicPanel({ epic, onClear }) {
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

function StoryPanel({ story, onClear }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--blue)',
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
              color: 'var(--blue)',
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            Active Story
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
            {story.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>ID: {story.id}</div>
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
          title="Clear active story"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ReferenceLibrary() {
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
              <button
                onClick={() => handleRemove(id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: 11,
                  cursor: 'pointer',
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                Remove
              </button>
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
            <button
              onClick={handleAdd}
              disabled={adding || !addInput.trim()}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: adding ? 'var(--text-dim)' : 'var(--text-muted)',
                fontSize: 12,
                padding: '4px 10px',
                cursor: adding ? 'not-allowed' : 'pointer',
              }}
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [contextStatus, setContextStatus] = useState(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [activeObjective, setActiveObjective] = useState(null);
  const [activeEpic, setActiveEpic] = useState(null);
  const [activeStory, setActiveStory] = useState(null);
  const [loadingObjective, setLoadingObjective] = useState(false);
  const [objectiveError, setObjectiveError] = useState(null);
  const [activeRepos, setActiveRepos] = useState([]);
  const [repoInput, setRepoInput] = useState('');
  const [repoExpanded, setRepoExpanded] = useState(false);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState(null);
  // Each entry: { id, name, summary } — summary is null while loading
  const [transcripts, setTranscripts] = useState([]);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef(null);
  // PRD
  const [prdText, setPrdText] = useState('');
  const [prdFileName, setPrdFileName] = useState(null);
  const [prdExpanded, setPrdExpanded] = useState(false);
  const [pendingPrd, setPendingPrd] = useState(null);
  const [prdShowPaste, setPrdShowPaste] = useState(false);
  const [prdPasteInput, setPrdPasteInput] = useState('');
  const prdFileInputRef = useRef(null);

  const transcriptSummary =
    transcripts.length > 0
      ? transcripts
          .map((t, i) => `**Meeting ${i + 1}: ${t.name}**\n\n${t.summary ?? '(summarizing…)'}`)
          .join('\n\n---\n\n')
      : null;

  useEffect(() => {
    fetchContextStatus();
  }, []);

  useEffect(() => {
    setActiveEpic(null);
    setActiveStory(null);
  }, [activeObjective]);

  useEffect(() => {
    setActiveStory(null);
  }, [activeEpic]);

  async function fetchContextStatus() {
    try {
      const res = await fetch('/api/context-status');
      const data = await res.json();
      setContextStatus(data);
    } catch {
      setContextStatus({ exists: false, is_stale: true, refreshed_at: null });
    }
  }

  async function handleRefresh() {
    await fetch('/api/bootstrap', { method: 'POST' });
    await fetchContextStatus();

    if (activeObjective) {
      try {
        const res = await fetch(`/api/objective/${activeObjective.id}`);
        const data = await res.json();
        if (res.ok) setActiveObjective(data);
      } catch {
        // silently fail — objective stays as-is if refresh fetch errors
      }
    }
  }

  async function handleLoadObjective() {
    const id = parseObjectiveId(objectiveInput);
    if (!id) {
      setObjectiveError('Enter a valid Shortcut objective ID or URL');
      return;
    }

    setLoadingObjective(true);
    setObjectiveError(null);

    try {
      const res = await fetch(`/api/objective/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load objective');
      setActiveObjective(data);
      setObjectiveInput('');
    } catch (err) {
      setObjectiveError(err.message);
    } finally {
      setLoadingObjective(false);
    }
  }

  async function handleLoadRepo() {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) { setRepoError('Enter a GitHub URL or owner/repo'); return; }
    if (activeRepos.some((r) => r.owner === parsed.owner && r.repo === parsed.repo)) {
      setRepoError('Already loaded'); return;
    }
    setLoadingRepo(true);
    setRepoError(null);
    try {
      const res = await fetch(`/api/repo/${parsed.owner}/${parsed.repo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load repo');
      setActiveRepos((prev) => [...prev, data]);
      setRepoInput('');
    } catch (err) {
      setRepoError(err.message);
    } finally {
      setLoadingRepo(false);
    }
  }

  async function addTranscript(name, rawText) {
    const id = Date.now();
    setTranscripts((prev) => [...prev, { id, name, summary: null }]);
    try {
      const res = await fetch('/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: rawText }),
      });
      const data = await res.json();
      setTranscripts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, summary: data.summary } : t))
      );
    } catch {
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleFileUpload(file) {
    if (!file || !file.name.endsWith('.txt')) return;
    const text = await file.text();
    await addTranscript(file.name, text);
  }

  async function handlePasteLoad() {
    if (!pasteText.trim()) return;
    const name = `Pasted transcript ${transcripts.length + 1}`;
    setPasteText('');
    setShowPaste(false);
    await addTranscript(name, pasteText);
  }

  async function handlePrdFileUpload(file) {
    if (!file) return;
    const text = await file.text();
    setPrdText(text);
    setPrdFileName(file.name);
    setPrdExpanded(true);
  }

  function handleConvertPrd() {
    if (!prdText.trim()) return;
    const prompt = `Convert the following PRD into a complete objective using our objective template and writing style. Match the depth and structure of the reference objectives.\n\n---\n\n${prdText.trim()}`;
    setPendingPrd(prompt);
    setPrdText('');
    setPrdFileName(null);
    setPrdExpanded(false);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 20,
          overflowY: 'auto',
        }}
      >
        {/* Logo + New Session */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              R
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Product Helper
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Roots · AI Planning</div>
            </div>
          </div>
          <button
            onClick={() => setSessionKey((k) => k + 1)}
            title="New chat — clears conversation history. Active objective and transcript stay loaded."
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-dim)',
              fontSize: 11,
              padding: '3px 8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-dim)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-dim)';
            }}
          >
            New chat
          </button>
        </div>

        {/* Context Badge */}
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Context
          </div>
          <ContextBadge status={contextStatus} onRefresh={handleRefresh} />
        </div>

        {/* PRD */}
        <div>
          <button
            onClick={() => setPrdExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: prdText ? 'var(--text-muted)' : 'var(--text-dim)',
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
              marginBottom: prdExpanded ? 8 : 0,
            }}
          >
            <span style={{ color: 'var(--text-dim)' }}>{prdExpanded ? '▾' : '▸'}</span>
            PRD
            {prdText && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--amber-bg)',
                  color: 'var(--amber)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'none',
                }}
              >
                loaded
              </span>
            )}
          </button>

          {prdExpanded && (
            <div>
              {/* Hidden file input */}
              <input
                ref={prdFileInputRef}
                type="file"
                accept=".txt,.md"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePrdFileUpload(file);
                  e.target.value = '';
                }}
              />

              {/* Loaded item */}
              {prdText && (
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prdFileName || 'Pasted PRD'}
                      </div>
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>✓</span>
                    <button
                      onClick={() => { setPrdText(''); setPrdFileName(null); }}
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
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Drop zone (empty) or Replace button (loaded) */}
              {!prdText ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePrdFileUpload(file);
                  }}
                  onClick={() => prdFileInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Drop .txt / .md here
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}>
                    or click to pick
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => prdFileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: 6,
                  }}
                >
                  + Replace file
                </button>
              )}

              {/* Paste toggle */}
              {!prdShowPaste ? (
                <button
                  onClick={() => setPrdShowPaste(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '4px 0',
                    marginTop: 4,
                    display: 'block',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  or paste manually
                </button>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <textarea
                    value={prdPasteInput}
                    onChange={(e) => setPrdPasteInput(e.target.value)}
                    placeholder="Paste PRD text here…"
                    rows={5}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      padding: '8px',
                      resize: 'vertical',
                      outline: 'none',
                      minHeight: 80,
                      maxHeight: 180,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => {
                        if (!prdPasteInput.trim()) return;
                        setPrdText(prdPasteInput.trim());
                        setPrdFileName(null);
                        setPrdPasteInput('');
                        setPrdShowPaste(false);
                      }}
                      disabled={!prdPasteInput.trim()}
                      style={{
                        flex: 1,
                        background: prdPasteInput.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: prdPasteInput.trim() ? '#000' : 'var(--text-dim)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 12px',
                        cursor: prdPasteInput.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => { setPrdShowPaste(false); setPrdPasteInput(''); }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-dim)',
                        fontSize: 12,
                        padding: '5px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleConvertPrd}
                disabled={!prdText.trim()}
                style={{
                  width: '100%',
                  background: prdText.trim() ? 'var(--amber)' : 'var(--bg-hover)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: prdText.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  cursor: prdText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                  marginTop: 8,
                }}
              >
                Convert to Objective →
              </button>
            </div>
          )}
        </div>

        {/* Active Objective */}
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Active Objective
          </div>

          {activeObjective ? (
            <ObjectivePanel
              objective={activeObjective}
              onClear={() => setActiveObjective(null)}
            />
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={objectiveInput}
                  onChange={(e) => {
                    setObjectiveInput(e.target.value);
                    setObjectiveError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadObjective()}
                  placeholder="ID or Shortcut URL"
                  style={{
                    flex: 1,
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${objectiveError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontSize: 12,
                    padding: '6px 8px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleLoadObjective}
                  disabled={loadingObjective || !objectiveInput.trim()}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: loadingObjective ? 'var(--text-dim)' : 'var(--text-muted)',
                    fontSize: 12,
                    padding: '6px 10px',
                    cursor: loadingObjective ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loadingObjective ? '...' : 'Load'}
                </button>
              </div>
              {objectiveError && (
                <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>
                  {objectiveError}
                </div>
              )}
              <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
                Paste a Shortcut objective ID or URL
              </div>
            </div>
          )}
          {activeEpic && (
            <EpicPanel epic={activeEpic} onClear={() => setActiveEpic(null)} />
          )}
          {activeStory && (
            <StoryPanel story={activeStory} onClear={() => setActiveStory(null)} />
          )}
        </div>

        {/* Meeting Transcripts */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <button
            onClick={() => setTranscriptExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: transcripts.length > 0 ? 'var(--text-muted)' : 'var(--text-dim)',
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
              marginBottom: transcriptExpanded ? 8 : 0,
            }}
          >
            <span style={{ color: 'var(--text-dim)' }}>{transcriptExpanded ? '▾' : '▸'}</span>
            Meeting Transcripts
            {transcripts.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'none',
                }}
              >
                {transcripts.length} loaded
              </span>
            )}
          </button>

          {transcriptExpanded && (
            <div>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach(handleFileUpload);
                  e.target.value = '';
                }}
              />

              {/* Transcript list */}
              {transcripts.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {transcripts.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.name}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: 11 }}>
                        {t.summary === null ? (
                          <span style={{ color: 'var(--text-dim)' }}>…</span>
                        ) : (
                          <span style={{ color: 'var(--accent)' }}>✓</span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setTranscripts((prev) => prev.filter((x) => x.id !== t.id))
                        }
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
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone (shown when empty) or "Add another" button */}
              {transcripts.length === 0 ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    Array.from(e.dataTransfer.files).forEach(handleFileUpload);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Drop .txt file here
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}>
                    or click to pick
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: 6,
                  }}
                >
                  + Add another
                </button>
              )}

              {/* Paste toggle */}
              {!showPaste ? (
                <button
                  onClick={() => setShowPaste(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '4px 0',
                    marginTop: 4,
                    display: 'block',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  or paste manually
                </button>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste transcript text here…"
                    rows={5}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      padding: '8px',
                      resize: 'vertical',
                      outline: 'none',
                      minHeight: 80,
                      maxHeight: 180,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={handlePasteLoad}
                      disabled={!pasteText.trim()}
                      style={{
                        flex: 1,
                        background: pasteText.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: pasteText.trim() ? '#000' : 'var(--text-dim)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 12px',
                        cursor: pasteText.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => { setShowPaste(false); setPasteText(''); }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-dim)',
                        fontSize: 12,
                        padding: '5px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Summarized by Haiku — raw text never goes to Opus.
              </p>
            </div>
          )}
        </div>

        {/* GitHub Repos */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <button
            onClick={() => setRepoExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: activeRepos.length > 0 ? 'var(--text-muted)' : 'var(--text-dim)',
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
              marginBottom: repoExpanded ? 8 : 0,
            }}
          >
            <span style={{ color: 'var(--text-dim)' }}>{repoExpanded ? '▾' : '▸'}</span>
            GitHub Repos
            {activeRepos.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'none',
                }}
              >
                {activeRepos.length} loaded
              </span>
            )}
          </button>

          {repoExpanded && (
            <div>
              {activeRepos.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {activeRepos.map((r) => (
                    <div
                      key={`${r.owner}/${r.repo}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.full_name}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setActiveRepos((prev) =>
                            prev.filter((x) => !(x.owner === r.owner && x.repo === r.repo))
                          )
                        }
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
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={repoInput}
                  onChange={(e) => { setRepoInput(e.target.value); setRepoError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadRepo()}
                  placeholder="owner/repo or GitHub URL"
                  style={{
                    flex: 1,
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${repoError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontSize: 12,
                    padding: '4px 8px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleLoadRepo}
                  disabled={loadingRepo || !repoInput.trim()}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: loadingRepo ? 'var(--text-dim)' : 'var(--text-muted)',
                    fontSize: 12,
                    padding: '4px 10px',
                    cursor: loadingRepo ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingRepo ? '...' : 'Load'}
                </button>
              </div>
              {repoError && (
                <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>
                  {repoError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reference Library */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 16,
          }}
        >
          <ReferenceLibrary />
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Chat
          key={sessionKey}
          activeObjective={activeObjective}
          transcriptSummary={transcriptSummary}
          activeRepos={activeRepos}
          pendingPrd={pendingPrd}
          onPrdSent={() => setPendingPrd(null)}
          onRequestTranscriptPanel={() => setTranscriptExpanded(true)}
          activeEpic={activeEpic}
          onEpicCreated={setActiveEpic}
          onStoryCreated={setActiveStory}
        />
      </div>
    </div>
  );
}
