import { useState } from 'react';
import StepFlow from './StepFlow.jsx';

const TABS = [
  {
    label: 'Settings',
    title: 'Set up your API keys',
    content: (
      <>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 12px 0' }}>
          Open Settings (⚙ bottom of sidebar) and enter your tokens. Anthropic and Shortcut are required — without them the app won't function. GitHub and Figma are optional but unlock additional context features.
        </p>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
          <li><strong style={{ color: 'var(--text)' }}>Anthropic</strong> — powers all AI responses</li>
          <li><strong style={{ color: 'var(--text)' }}>Shortcut</strong> — creates and reads stories, epics, and objectives</li>
          <li><strong style={{ color: 'var(--text)' }}>GitHub</strong> — loads repo context: README, open PRs, issues</li>
          <li><strong style={{ color: 'var(--text)' }}>Figma</strong> — reads designs and attaches them to your conversation</li>
        </ul>
      </>
    ),
  },
  {
    label: 'Context',
    title: 'Give Claude the full picture',
    content: (
      <>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 4px 0' }}>
          Claude already has your team's SDLC process, templates, and reference objectives loaded at startup.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 10px 0' }}>
          What it doesn't have is your current project's specifics — that's the gap context fills. Three sources, each adding a different dimension:
        </p>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16, margin: '0 0 12px 0' }}>
          <li><strong style={{ color: 'var(--text)' }}>Meeting transcripts</strong> — Drop a <code style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 4px', borderRadius: 3 }}>.txt</code> file into the Meeting Transcripts panel, or paste the text directly. Claude summarizes it using a lightweight model (the raw text never reaches the main AI) and injects the summary into every subsequent message.</li>
          <li><strong style={{ color: 'var(--text)' }}>Figma designs</strong> — Paste any Figma URL that includes a <code style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 4px', borderRadius: 3 }}>node-id</code> and press Add. Claude reads the screen layout, component structure, and annotations — not just a link, but the actual design content embedded in the conversation.</li>
          <li><strong style={{ color: 'var(--text)' }}>GitHub repos</strong> — Add a repo and Claude gains visibility into the README, open pull requests, and recent issues. This prevents drafts from duplicating work already in flight.</li>
        </ul>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best practice</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '3px 0 0 0' }}>
            Load all context relevant to your session before drafting. Claude layers it all together.
          </p>
        </div>
      </>
    ),
  },
  {
    label: 'Objective',
    title: 'Anchor your work to an objective',
    content: (
      <>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 12px 0' }}>
          The active objective is the most important signal you can give Claude. When loaded, it knows the goal, the milestones, and the existing epics — and uses all of that to shape every draft it produces.
        </p>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 12px', margin: '0 0 12px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to load</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '3px 0 0 0' }}>
            Paste a Shortcut objective ID or full URL into the "Active Objective" field in the sidebar, then press Load. Your epics and milestones appear immediately.
          </p>
        </div>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16, margin: '0 0 12px 0' }}>
          <li>Every story or epic Claude drafts will be anchored to this objective automatically</li>
          <li>Don't have an ID? Ask Claude — it has your team's full objective list and can find the right one</li>
        </ul>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          Working without an objective is possible, but output quality improves significantly when Claude has a real initiative to anchor against.
        </p>
      </>
    ),
  },
  {
    label: 'Epics',
    title: 'Load or draft epics',
    content: (
      <>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 8px 0' }}>
          Two ways to get an epic into context:
        </p>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16, margin: '0 0 12px 0' }}>
          <li><strong style={{ color: 'var(--text)' }}>Ask Claude</strong> — Use natural language: "Let's pull the epic for the 2nd milestone into context" or "Let's pull the epic called [name] into context." Claude will find it and activate it — you'll see the sidebar update.</li>
          <li><strong style={{ color: 'var(--text)' }}>Create one</strong> — Ask Claude to draft an epic with your objective active. Once you hit <span style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--amber)', color: '#000', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', verticalAlign: 'middle' }}>Create in Shortcut</span>, it becomes the active epic automatically.</li>
        </ul>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 12px', margin: '0 0 12px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Once active</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '3px 0 0 0' }}>
            Claude uses the epic's description and existing stories as context for everything you draft. New stories are filed under it automatically — no manual linking needed.
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          Drafting a new epic? Ask Claude with your objective loaded. It'll use your epic template, scope it against the milestones, and produce a draft card ready to review and create.
        </p>
      </>
    ),
  },
  {
    label: 'Stories',
    title: 'Draft, refine, and create',
    content: (
      <>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 10px 0' }}>
          Stories are the primary output. The recommended workflow:
        </p>
        <div style={{ margin: '0 0 12px 0' }}>
          <StepFlow steps={['Load objective', 'Add context', 'Load / draft epic', 'Draft stories']} />
        </div>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16, margin: '0 0 12px 0' }}>
          <li>Ask for stories one at a time — each one benefits from reviewing what came before</li>
          <li>Draft cards appear inline with a <span style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--blue)', color: '#000', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', verticalAlign: 'middle' }}>Create in Shortcut</span> button. Refine with Claude before committing — tighten scope, add acceptance criteria, adjust the effort estimate</li>
          <li>Once you create a story, Claude knows it exists and accounts for it in subsequent drafts</li>
        </ul>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 12px', margin: '0 0 12px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created under the active epic</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '3px 0 0 0' }}>
            Stories are created under the active epic automatically. Switch epics mid-session by asking Claude to load the new one — all subsequent stories will target it.
          </p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          Batch drafting is possible ("give me 5 stories for this epic") but the one-at-a-time loop produces better output. It's worth the extra turns.
        </p>
      </>
    ),
  },
  {
    label: 'Tips',
    title: 'Things worth knowing',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { title: 'Pasted images work', desc: 'Screenshots, mockups, whiteboard photos — paste directly into chat. Useful for UI context that isn\'t in Figma yet.' },
          { title: 'New chat ≠ lost context', desc: 'Conversation history clears but sidebar state persists. Active objective, epic, and loaded context all carry over.' },
          { title: 'Ask Claude what it knows', desc: '"What epics are in this objective?" or "Summarize the active epic." Useful for sanity checking before you start drafting.' },
          { title: 'QA before you create', desc: '"Does this story follow our template?" or "Is this scoped correctly?" Claude will check against your SDLC standards.' },
          { title: 'Chat history auto-names', desc: 'Sessions save under the active objective name. Rename from the Chat History panel if you run multiple sessions per objective.' },
        ].map(({ title, desc }) => (
          <div key={title} style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '7px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Workflows',
    title: 'End-to-end workflows',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          {
            title: 'PRD to stories',
            steps: ['Upload PRD', 'Add context', 'Draft objective', 'Draft milestones', 'Draft epic', 'Draft stories'],
            note: 'Have a PRD? Upload it.\nDon\'t have one? Ask Claude to help you write it first.',
          },
          {
            title: 'Stakeholder-driven build-out',
            steps: ['Stakeholder meeting', 'Transcribe', 'Draft objective', 'Engineering review', 'Transcribe', 'Milestones', 'Epics', 'Draft stories'],
            note: 'Optionally, have engineering create an implementation plan with Claude Code — bring that output in to sharpen the milestones.',
          },
          {
            title: 'Refine an existing objective',
            steps: ['Load objective', 'Add context', 'Refine epics', 'Draft stories'],
            note: 'Add meeting transcripts and Figma designs before refining — the richer the context, the tighter the output.',
          },
          {
            title: 'GitHub-informed story drafting',
            steps: ['Load objective', 'Load epic', 'Load GitHub', 'Draft stories'],
            note: 'Load the relevant repo before drafting. Claude reads the README, open PRs, and recent issues so stories reflect what\'s actually been built and what\'s in flight.',
          },
        ].map(({ title, steps, note, desc }) => (
          <div key={title} style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '7px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: steps ? 6 : 2 }}>{title}</div>
            {steps && (
              <>
                <StepFlow steps={steps} />
                {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6, fontStyle: 'italic', whiteSpace: 'pre-line' }}>{note}</div>}
              </>
            )}
            {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>}
          </div>
        ))}
      </div>
    ),
  },
];

export default function UserGuide({ onClose, onDismiss }) {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          width: 520,
          maxWidth: '92vw',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Getting started</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 16px' }}>
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '7px 12px',
                border: 'none',
                borderBottom: i === activeTab ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'none',
                color: i === activeTab ? 'var(--text)' : 'var(--text-dim)',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 16px', minHeight: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            {tab.title}
          </div>
          {tab.content}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              onChange={onDismiss}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Don't show again</span>
          </label>
          <button
            onClick={onClose}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 16px',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
