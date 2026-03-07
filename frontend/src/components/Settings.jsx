import { useState, useEffect } from 'react';

const FIELDS = [
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    required: true,
    description: 'Powers all AI responses in this tool.',
    permissions: 'Any API key from the Anthropic Console — no special scopes required.',
    href: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'console.anthropic.com',
  },
  {
    key: 'SHORTCUT_API_TOKEN',
    label: 'Shortcut API Token',
    required: true,
    description: 'Enables creating and reading stories, epics, and objectives in Shortcut.',
    permissions: 'Any API token from Shortcut — full workspace access.',
    href: 'https://app.shortcut.com/settings/api-tokens',
    linkLabel: 'app.shortcut.com',
  },
  {
    key: 'GITHUB_TOKEN',
    label: 'GitHub Personal Access Token',
    required: false,
    description: 'Allows loading repo context (README, issues, PRs) into the AI.',
    permissions: 'Classic PAT with repo scope — read access to repos, issues, and PRs.',
    href: 'https://github.com/settings/tokens',
    linkLabel: 'github.com/settings/tokens',
  },
  {
    key: 'FIGMA_API_TOKEN',
    label: 'Figma Access Token',
    required: false,
    description: 'Enables reading Figma designs and attaching them to conversations.',
    permissions: 'Personal access token from Figma account settings — read-only by default.',
    href: 'https://www.figma.com/settings',
    linkLabel: 'figma.com/settings',
  },
];

export default function Settings({ onClose, initialStatus }) {
  const [loaded, setLoaded] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (initialStatus) {
      const vals = {};
      for (const f of FIELDS) vals[f.key] = initialStatus[f.key]?.value || '';
      setLoaded(vals);
      setValues(vals);
    } else {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          const vals = {};
          for (const f of FIELDS) vals[f.key] = data.settings[f.key]?.value || '';
          setLoaded(vals);
          setValues(vals);
        })
        .catch(() => {
          const empty = {};
          for (const f of FIELDS) empty[f.key] = '';
          setLoaded(empty);
          setValues(empty);
        });
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setSavedMsg('');
    const body = {};
    for (const f of FIELDS) {
      if (values[f.key].trim()) body[f.key] = values[f.key].trim();
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await fetch('/api/settings').then((r) => r.json());
      const vals = {};
      for (const f of FIELDS) vals[f.key] = data.settings[f.key]?.value || '';
      setLoaded(vals);
      setValues(vals);
      setSavedMsg('Saved.');
    } catch {
      setSavedMsg('Error saving. Try again.');
    } finally {
      setSaving(false);
    }
  }

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
          width: 480,
          maxWidth: '92vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {FIELDS.map((f) => (
            <div
              key={f.key}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                {f.required ? (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 3, padding: '1px 5px' }}>
                    Required
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>
                    Optional
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>
                {f.description} {f.permissions}{' '}
                <a href={f.href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  {f.linkLabel} ↗
                </a>
              </div>
              <input
                type="password"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.required ? 'Required' : 'Optional'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: 12,
                  padding: '6px 10px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          {savedMsg && (
            <span style={{ fontSize: 12, color: savedMsg.startsWith('Error') ? 'var(--red)' : 'var(--text-dim)' }}>
              {savedMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !loaded}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 16px',
              cursor: saving || !loaded ? 'not-allowed' : 'pointer',
              opacity: saving || !loaded ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
