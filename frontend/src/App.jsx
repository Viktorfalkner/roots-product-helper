import { useState, useEffect } from 'react';
import Chat from './components/Chat.jsx';
import ContextBadge from './components/ContextBadge.jsx';
import SidebarButton from './components/SidebarButton.jsx';
import ChatHistoryPanel from './components/ChatHistoryPanel.jsx';
import { listChats, deleteChat } from './lib/chatHistory.js';
import Settings from './components/Settings.jsx';
import ObjectivePanel from './components/ObjectivePanel.jsx';
import EpicPanel from './components/EpicPanel.jsx';
import StoryPanel from './components/StoryPanel.jsx';
import ReferenceLibrary from './components/ReferenceLibrary.jsx';
import RepoPicker from './components/RepoPicker.jsx';
import CollapsibleSection from './components/CollapsibleSection.jsx';
import UserGuide from './components/UserGuide.jsx';
import { isDismissed, dismiss } from './lib/guidePreference.js';
import { useObjectiveContext } from './hooks/useObjectiveContext.js';
import { useRepositoryContext } from './hooks/useRepositoryContext.js';
import { useTranscriptContext } from './hooks/useTranscriptContext.js';
import { usePrdContext } from './hooks/usePrdContext.js';
import { useFigmaContext } from './hooks/useFigmaContext.js';
import { useChatHistory } from './hooks/useChatHistory.js';

export default function App() {
  const [contextStatus, setContextStatus] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [guideOpen, setGuideOpen] = useState(() => !isDismissed());

  // Chat message state lives here to avoid circular dep with buildChatContext
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState('claude-opus-4-6');
  const [chatFigmaLinks, setChatFigmaLinks] = useState([]);

  const {
    objectiveInput, setObjectiveInput,
    activeObjective, setActiveObjective,
    loadingObjective,
    objectiveError, setObjectiveError,
    activeEpic, setActiveEpic,
    activeStory, setActiveStory,
    handleLoadObjective,
  } = useObjectiveContext();

  const {
    activeRepos, setActiveRepos,
    repoExpanded, setRepoExpanded,
    loadingRepo, repoError,
    repoPickerOpen, setRepoPickerOpen,
    repoPickerList, repoPickerLoading, repoPickerError,
    repoPickerSearch, setRepoPickerSearch,
    starredRepos,
    handleLoadRepo, openRepoPicker, toggleStarRepo,
  } = useRepositoryContext();

  const {
    transcripts, setTranscripts,
    transcriptExpanded, setTranscriptExpanded,
    showPaste, setShowPaste,
    pasteText, setPasteText,
    fileInputRef,
    transcriptSummary,
    handleFileUpload, handlePasteLoad,
  } = useTranscriptContext();

  const {
    prdText, setPrdText,
    prdFileName, setPrdFileName,
    prdExpanded, setPrdExpanded,
    pendingPrd, setPendingPrd,
    prdShowPaste, setPrdShowPaste,
    prdPasteInput, setPrdPasteInput,
    prdFileInputRef,
    handlePrdFileUpload, handleConvertPrd,
  } = usePrdContext();

  const {
    figmaLinks, setFigmaLinks,
    figmaInput, setFigmaInput,
    figmaExpanded, setFigmaExpanded,
    figmaError, setFigmaError,
    handleAddFigmaLink,
  } = useFigmaContext();

  function buildChatContext() {
    return {
      activeObjective: activeObjective || null,
      activeEpic: activeEpic || null,
      activeRepos: activeRepos || [],
      transcripts: transcripts || [],
      figmaLinks: chatFigmaLinks || [],
      sidebarFigmaLinks: figmaLinks || [],
      prdText: prdText || '',
      model,
    };
  }

  const {
    currentChatId,
    chatHistory, setChatHistory,
    sessionKey,
    handleNewChat,
    handleRestoreChat,
    handleRenameChat,
    handleStarChat,
  } = useChatHistory({
    messages,
    activeObjective,
    buildContext: buildChatContext,
    onNewChat: () => {
      setMessages([]);
      setModel('claude-opus-4-6');
      setChatFigmaLinks([]);
    },
    onRestoreChat: (chat) => {
      setMessages(chat.messages || []);
      setModel(chat.context?.model || 'claude-opus-4-6');
      setChatFigmaLinks(chat.context?.figmaLinks || []);
      if (chat.context?.activeObjective) setActiveObjective(chat.context.activeObjective);
      if (chat.context?.activeEpic) setActiveEpic(chat.context.activeEpic);
      setActiveRepos(chat.context?.activeRepos || []);
      setTranscripts(chat.context?.transcripts || []);
      setFigmaLinks(chat.context?.sidebarFigmaLinks || []);
      if (chat.context?.prdText) setPrdText(chat.context.prdText);
    },
  });

  useEffect(() => {
    fetchContextStatus();
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettingsStatus(data.settings))
      .catch(() => {});
  }, []);

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

  function handleClearContext() {
    setObjectiveInput('');
    setActiveObjective(null);
    setActiveEpic(null);
    setActiveStory(null);
    setActiveRepos([]);
    setFigmaLinks([]);
    setFigmaInput('');
    setTranscripts([]);
    setPrdText('');
    setPrdFileName(null);
    setPendingPrd(null);
    setChatFigmaLinks([]);
  }

  return (
    <>
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
          <SidebarButton onClick={handleNewChat} size="sm" title="New chat — clears conversation history. Active objective and transcript stay loaded.">
            New chat
          </SidebarButton>
        </div>

        {/* Chat History */}
        <ChatHistoryPanel
          chats={chatHistory}
          currentChatId={currentChatId}
          onRestore={handleRestoreChat}
          onRename={handleRenameChat}
          onStar={handleStarChat}
          onDelete={(id) => {
            deleteChat(id);
            setChatHistory(listChats());
            if (id === currentChatId) handleNewChat();
          }}
        />

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
          <ContextBadge status={contextStatus} onRefresh={handleRefresh} onClear={handleClearContext} />
        </div>

        {/* PRD */}
        <div>
          <CollapsibleSection
            title="PRD"
            expanded={prdExpanded}
            onToggle={() => setPrdExpanded((v) => !v)}
            active={!!prdText}
            badge={prdText && (
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
          >
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
                <SidebarButton onClick={() => prdFileInputRef.current?.click()} fullWidth style={{ marginBottom: 6 }}>
                  + Replace file
                </SidebarButton>
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
                    <SidebarButton onClick={() => { setPrdShowPaste(false); setPrdPasteInput(''); }}>
                      Cancel
                    </SidebarButton>
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
          </CollapsibleSection>
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
                <SidebarButton
                  onClick={handleLoadObjective}
                  disabled={loadingObjective || !objectiveInput.trim()}
                >
                  {loadingObjective ? '...' : 'Load'}
                </SidebarButton>
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
          <CollapsibleSection
            title="Meeting Transcripts"
            expanded={transcriptExpanded}
            onToggle={() => setTranscriptExpanded((v) => !v)}
            active={transcripts.length > 0}
            badge={transcripts.length > 0 && (
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
          >
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
                <SidebarButton onClick={() => fileInputRef.current?.click()} fullWidth style={{ marginBottom: 6 }}>
                  + Add another
                </SidebarButton>
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
                    <SidebarButton onClick={() => { setShowPaste(false); setPasteText(''); }}>
                      Cancel
                    </SidebarButton>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Summarized by Haiku — raw text never goes to Opus.
              </p>
            </div>
          </CollapsibleSection>
        </div>

        {/* Figma Links */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <CollapsibleSection
            title="Figma"
            expanded={figmaExpanded}
            onToggle={() => setFigmaExpanded((v) => !v)}
            active={figmaLinks.length > 0}
            badge={figmaLinks.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'color-mix(in srgb, #a78bfa 15%, transparent)',
                  color: '#a78bfa',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'none',
                }}
              >
                {figmaLinks.length} loaded
              </span>
            )}
          >
            <div>
              {figmaLinks.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {figmaLinks.map((link) => (
                    <div
                      key={link.url}
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
                            fontSize: 11,
                            color: '#a78bfa',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={link.url}
                        >
                          {link.label}
                        </div>
                      </div>
                      <button
                        onClick={() => setFigmaLinks((prev) => prev.filter((l) => l.url !== link.url))}
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
                  value={figmaInput}
                  onChange={(e) => { setFigmaInput(e.target.value); setFigmaError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFigmaLink()}
                  placeholder="Paste Figma URL with node-id"
                  style={{
                    flex: 1,
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${figmaError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontSize: 12,
                    padding: '4px 8px',
                    outline: 'none',
                  }}
                />
                <SidebarButton onClick={handleAddFigmaLink} disabled={!figmaInput.trim()}>
                  Add
                </SidebarButton>
              </div>
              {figmaError && (
                <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>
                  {figmaError}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* GitHub Repos */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <CollapsibleSection
            title="GitHub Repos"
            expanded={repoExpanded}
            onToggle={() => setRepoExpanded((v) => !v)}
            active={activeRepos.length > 0}
            badge={activeRepos.length > 0 && (
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
          >
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

              <SidebarButton onClick={openRepoPicker} disabled={loadingRepo} fullWidth>
                {loadingRepo ? 'Loading...' : '+ Add repository'}
              </SidebarButton>
              {repoError && (
                <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>
                  {repoError}
                </div>
              )}
            </div>
          </CollapsibleSection>
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

        {/* Settings */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 12,
              padding: '4px 2px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            <span style={{ fontSize: 14 }}>⚙</span>
            Settings
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Chat
          key={sessionKey}
          activeObjective={activeObjective}
          transcriptSummary={transcriptSummary}
          activeRepos={activeRepos}
          sidebarFigmaLinks={figmaLinks}
          pendingPrd={pendingPrd}
          onPrdSent={() => setPendingPrd(null)}
          onRequestTranscriptPanel={() => setTranscriptExpanded(true)}
          activeEpic={activeEpic}
          onEpicCreated={setActiveEpic}
          onStoryCreated={setActiveStory}
          onObjectiveLoaded={setActiveObjective}
          messages={messages}
          setMessages={setMessages}
          model={model}
          setModel={setModel}
          chatFigmaLinks={chatFigmaLinks}
          setChatFigmaLinks={setChatFigmaLinks}
        />
      </div>
    </div>
    {settingsOpen && (
      <Settings
        onClose={() => setSettingsOpen(false)}
        initialStatus={settingsStatus}
        onShowGuide={() => { setSettingsOpen(false); setGuideOpen(true); }}
      />
    )}
    {guideOpen && (
      <UserGuide
        onClose={() => setGuideOpen(false)}
        onDismiss={() => { dismiss(); setGuideOpen(false); }}
      />
    )}
    {repoPickerOpen && (
      <RepoPicker
        repos={repoPickerList}
        loading={repoPickerLoading}
        error={repoPickerError}
        search={repoPickerSearch}
        onSearch={setRepoPickerSearch}
        onSelect={handleLoadRepo}
        onClose={() => setRepoPickerOpen(false)}
        alreadyLoaded={activeRepos}
        starred={starredRepos}
        onToggleStar={toggleStarRepo}
      />
    )}
    </>
  );
}
