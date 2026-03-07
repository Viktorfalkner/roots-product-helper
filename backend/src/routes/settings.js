import { Router } from 'express';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const router = Router();

const SETTINGS_KEYS = ['ANTHROPIC_API_KEY', 'SHORTCUT_API_TOKEN', 'GITHUB_TOKEN', 'FIGMA_API_TOKEN'];

function parseEnv(raw) {
  const map = new Map();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return map;
}

function serializeEnv(originalRaw, updates) {
  const lines = originalRaw ? originalRaw.split('\n') : [];
  const written = new Set();
  const result = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (updates.has(key)) {
      written.add(key);
      return `${key}=${updates.get(key)}`;
    }
    return line;
  });
  for (const [key, val] of updates) {
    if (!written.has(key)) result.push(`${key}=${val}`);
  }
  return result.join('\n').trimEnd() + '\n';
}

export function createSettingsRouter(ENV_PATH) {
  router.get('/api/settings', (_req, res) => {
    const raw = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
    const current = parseEnv(raw);
    const settings = {};
    for (const key of SETTINGS_KEYS) {
      settings[key] = { value: current.get(key) || '' };
    }
    res.json({ settings });
  });

  router.post('/api/settings', (req, res) => {
    try {
      const updates = new Map();
      for (const key of SETTINGS_KEYS) {
        const val = req.body[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          updates.set(key, val.trim());
        }
      }
      if (updates.size === 0) return res.json({ ok: true });
      const raw = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
      writeFileSync(ENV_PATH, serializeEnv(raw, updates), 'utf-8');
      for (const [key, val] of updates) process.env[key] = val;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
