import { useState, useRef, useEffect } from 'react';
import Message from './Message.jsx';

const CONTEXT_EPIC_RE = /<!--\s*context:epic\s+id:(\d+)\s*-->/;

function getQuickStarters(activeObjective, transcriptSummary, activeRepos) {
  const hasMilestones = activeObjective?.key_results?.length > 0;
  const hasRepos = activeRepos?.length > 0;

  // Objective + transcript (most common combo — review meeting against objective)
  if (activeObjective && transcriptSummary && hasMilestones) {
    return [
      'Incorporate the transcript feedback into this objective',
      'Update milestones based on the meeting discussion',
      'What changed or needs to change after the meeting?',
      'Draft epics for the next milestone',
    ];
  }
  if (activeObjective && transcriptSummary && !hasMilestones) {
    return [
      'Incorporate the transcript feedback into this objective',
      'Draft milestones based on the meeting discussion',
      "What's missing after the meeting?",
      'Review the objective against the transcript decisions',
    ];
  }

  // Objective + repos (implementation drafting anchored to objective)
  if (activeObjective && hasRepos && hasMilestones) {
    return [
      'Draft implementation epics for the next milestone',
      'Draft stories for an epic using the repo for technical detail',
      "What's the right way to implement this given the codebase?",
      "What's still missing from this objective?",
    ];
  }
  if (activeObjective && hasRepos && !hasMilestones) {
    return [
      'Draft milestones for this objective',
      'Draft implementation epics based on the loaded repo',
      'What open work in the repo relates to this objective?',
      'Draft stories for a new feature',
    ];
  }

  // Objective only
  if (activeObjective && hasMilestones) {
    return [
      'Draft epics for the next milestone',
      'Draft stories for an epic',
      "What's still missing from this objective?",
      'Review milestone progress',
    ];
  }
  if (activeObjective && !hasMilestones) {
    return [
      'Draft milestones for this objective',
      "Review this objective and suggest what's missing",
      'Draft epics for a milestone',
      'Draft stories for an epic',
    ];
  }

  // No objective + transcript
  if (!activeObjective && transcriptSummary) {
    return [
      'Draft an objective from the loaded transcript',
      'Create a PRD',
      'Review the transcript decisions',
      'Turn meeting notes into a plan',
    ];
  }

  // No objective + repos (investigation only — don't draft without an objective)
  if (!activeObjective && hasRepos) {
    return [
      "What's currently in flight across the loaded repos?",
      'What open issues should be prioritized?',
      'Summarize the state of this codebase',
      'What areas need the most attention?',
    ];
  }

  // Nothing loaded
  return [
    'Draft a new objective',
    'Draft a PRD',
    'I have a feature idea — help me scope it',
    'Turn meeting notes into a plan',
  ];
}

const MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export default function Chat({ activeObjective, transcriptSummary, activeRepos, pendingPrd, onPrdSent, onRequestTranscriptPanel, activeEpic, onEpicCreated, onStoryCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('claude-opus-4-6');
  const [pendingModel, setPendingModel] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const lastEscRef = useRef(0);
  const historyRef = useRef([]);       // sent messages, oldest → newest
  const historyIndexRef = useRef(-1);  // -1 = not browsing
  const draftRef = useRef('');         // preserves in-progress text while browsing
  const navigatingRef = useRef(false); // prevents onChange from resetting index

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Double-ESC to abort in-progress request
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape' || !loading) return;
      const now = Date.now();
      if (now - lastEscRef.current < 600) {
        abortRef.current?.abort();
      }
      lastEscRef.current = now;
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading]);

  async function sendMessage(text) {
    const userMessage = text.trim();
    if (!userMessage || loading) return;

    setInput('');
    setError(null);
    historyRef.current.push(userMessage);
    historyIndexRef.current = -1;
    draftRef.current = '';

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          active_objective: activeObjective || null,
          transcript_summary: transcriptSummary || null,
          active_repos: activeRepos || [],
          model,
          active_epic: activeEpic || null,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      let responseText = data.response;

      const epicMatch = responseText.match(CONTEXT_EPIC_RE);
      if (epicMatch) {
        const epicId = parseInt(epicMatch[1], 10);
        responseText = responseText.replace(CONTEXT_EPIC_RE, '').replace(/\n{3,}/g, '\n\n').trim();
        fetch(`/api/epic/${epicId}`)
          .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
          .then(epic => onEpicCreated?.(epic))
          .catch(err => console.warn('Failed to load epic context:', err));
      }

      setMessages([...newMessages, { role: 'assistant', content: responseText }]);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Interrupted. (Press ESC twice while generating to cancel.)');
        setMessages(messages); // remove the pending user message
      } else {
        setError(err.message);
        setMessages(messages);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
      return;
    }

    if (e.key === 'ArrowUp') {
      const textarea = e.currentTarget;
      const cursorOnFirstLine = !input.slice(0, textarea.selectionStart).includes('\n');
      if (cursorOnFirstLine && historyRef.current.length > 0) {
        e.preventDefault();
        if (historyIndexRef.current === -1) draftRef.current = input;
        const next = historyIndexRef.current === -1
          ? historyRef.current.length - 1
          : Math.max(0, historyIndexRef.current - 1);
        historyIndexRef.current = next;
        navigatingRef.current = true;
        setInput(historyRef.current[next]);
      }
      return;
    }

    if (e.key === 'ArrowDown' && historyIndexRef.current !== -1) {
      const textarea = e.currentTarget;
      const cursorOnLastLine = !input.slice(textarea.selectionStart).includes('\n');
      if (cursorOnLastLine) {
        e.preventDefault();
        if (historyIndexRef.current === historyRef.current.length - 1) {
          historyIndexRef.current = -1;
          navigatingRef.current = true;
          setInput(draftRef.current);
        } else {
          historyIndexRef.current++;
          navigatingRef.current = true;
          setInput(historyRef.current[historyIndexRef.current]);
        }
      }
      return;
    }
  }

  // Fire pendingPrd from sidebar PRD panel
  useEffect(() => {
    if (!pendingPrd) return;
    sendMessage(pendingPrd);
    onPrdSent?.();
  }, [pendingPrd]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {isEmpty ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 24,
              padding: '0 24px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: 'var(--accent)',
                  fontWeight: 700,
                  margin: '0 auto 16px',
                }}
              >
                R
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Roots Product Helper
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360 }}>
                Context-loaded and ready. Draft objectives, epics, and stories — then push directly to Shortcut.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                width: '100%',
                maxWidth: 480,
              }}
            >
              {getQuickStarters(activeObjective, transcriptSummary, activeRepos).map((starter) => (
                <button
                  key={starter}
                  onClick={() => {
                    if (starter === 'Turn meeting notes into a plan' && !transcriptSummary) {
                      onRequestTranscriptPanel?.();
                    } else {
                      sendMessage(starter);
                    }
                  }}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-dim)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <Message
                key={i}
                role={msg.role}
                content={msg.content}
                activeObjective={activeObjective}
                activeEpic={activeEpic}
                onSendMessage={sendMessage}
                onEpicCreated={onEpicCreated}
                onStoryCreated={onStoryCreated}
              />
            ))}
            {loading && (
              <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'var(--accent)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    R
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          opacity: 0.7,
                          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: '0 16px 8px',
            padding: '8px 12px',
            background: 'var(--red-bg)',
            border: '1px solid var(--red)',
            borderRadius: 'var(--radius)',
            color: 'var(--red)',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 0 0 12px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
          }}
        >
          {/* Textarea + send row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                if (navigatingRef.current) {
                  navigatingRef.current = false;
                } else {
                  historyIndexRef.current = -1;
                }
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to draft an objective, epic, or story..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'var(--text)',
                fontSize: 14,
                lineHeight: 1.5,
                maxHeight: 160,
                overflow: 'auto',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-hover)',
                border: 'none',
                borderRadius: 6,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13"
                  stroke={input.trim() && !loading ? '#000' : 'var(--text-dim)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke={input.trim() && !loading ? '#000' : 'var(--text-dim)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Model selector row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid var(--border-subtle)',
              minHeight: 22,
            }}
          >
            {pendingModel ? (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  Switch to {MODELS.find((m) => m.id === pendingModel)?.label}? Your conversation and loaded context are preserved — the static prompt cache will re-establish on the first message, costing slightly more tokens.
                </span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setPendingModel(null)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text-dim)',
                      fontSize: 11,
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setModel(pendingModel); setPendingModel(null); }}
                    style={{
                      background: 'var(--accent)',
                      border: 'none',
                      borderRadius: 4,
                      color: '#000',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Switch
                  </button>
                </div>
              </>
            ) : (
              <select
                value={model}
                onChange={(e) => {
                  if (messages.length > 0) {
                    setPendingModel(e.target.value);
                  } else {
                    setModel(e.target.value);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-dim)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line · ESC ESC to interrupt
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .markdown-body { color: var(--text); font-size: 14px; line-height: 1.6; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
          color: var(--text); font-weight: 600; margin: 16px 0 8px; line-height: 1.3;
        }
        .markdown-body h1 { font-size: 18px; }
        .markdown-body h2 { font-size: 16px; }
        .markdown-body h3 { font-size: 14px; }
        .markdown-body h4 { font-size: 13px; color: var(--text-muted); }
        .markdown-body p { margin-bottom: 10px; }
        .markdown-body ul, .markdown-body ol { margin: 8px 0 10px 20px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body code {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 3px; padding: 1px 5px; font-size: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace; color: var(--accent);
        }
        .markdown-body pre {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 12px; overflow-x: auto; margin: 10px 0;
        }
        .markdown-body pre code {
          background: none; border: none; padding: 0; color: var(--text);
        }
        .markdown-body blockquote {
          border-left: 3px solid var(--border); padding-left: 12px;
          color: var(--text-muted); margin: 8px 0;
        }
        .markdown-body hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        .markdown-body strong { font-weight: 600; color: var(--text); }
        .markdown-body a { color: var(--blue); text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .markdown-body th, .markdown-body td {
          border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 13px;
        }
        .markdown-body th { background: var(--bg-elevated); font-weight: 600; }
      `}</style>
    </div>
  );
}
