import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

dotenv.config({ path: resolve(ROOT, '.env') });

import { chat, chatStream, summarizeTranscript } from './claude.js';
import { extractFigmaLinks, parseFigmaLinks, fetchFigmaImages, fetchFigmaNodeContext } from './figma.js';
import { loadCache, getCacheStatus } from './context.js';
import { getRepoContext, listUserRepos } from './github.js';
import {
  getObjectiveWithContext,
  getObjective,
  getEpic,
  listStoriesForEpic,
  createStory,
  createEpic,
  updateEpic,
  createObjective,
  updateObjective,
} from './shortcut.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Health ────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ─── Context Status ────────────────────────────────────────────────────────

app.get('/api/context-status', (_req, res) => {
  try {
    const status = getCacheStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────

app.post('/api/bootstrap', async (_req, res) => {
  try {
    // Run bootstrap script as a child process so it uses the same env
    execSync(`node ${resolve(__dirname, 'bootstrap.js')}`, {
      cwd: ROOT,
      env: process.env,
      stdio: 'pipe',
    });
    const status = getCacheStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Chat ─────────────────────────────────────────────────────────────────

app.post('/api/summarize-transcript', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript?.trim()) return res.status(400).json({ error: '`transcript` is required' });
  try {
    const summary = await summarizeTranscript(transcript);
    res.json({ summary });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_MODELS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]);

app.post('/api/chat', async (req, res) => {
  const { messages, active_objective, transcript_summary, active_repos, model, active_epic, figma_urls, pasted_images } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '`messages` array is required' });
  }

  const selectedModel = ALLOWED_MODELS.has(model) ? model : 'claude-opus-4-6';

  try {
    // Figma prep — parallel fetches before opening the stream
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const messageLinks = extractFigmaLinks(typeof lastUserText === 'string' ? lastUserText : '');
    const contextLinks = parseFigmaLinks(figma_urls || []);
    const seen = new Set(contextLinks.map((l) => l.url));
    const figmaLinks = [...contextLinks, ...messageLinks.filter((l) => !seen.has(l.url))];

    const [figmaImages, figmaContexts] = await Promise.all([
      fetchFigmaImages(figmaLinks),
      fetchFigmaNodeContext(figmaLinks),
    ]);

    const allImages = [...(pasted_images || []), ...figmaImages];

    // Open SSE connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = await chatStream(
      messages,
      active_objective || null,
      transcript_summary || null,
      active_repos || [],
      selectedModel,
      active_epic || null,
      allImages,
      figmaContexts
    );

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('finalMessage', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    // Abort the Claude stream if the client disconnects
    req.on('close', () => stream.abort());

  } catch (err) {
    console.error('Chat error:', err);
    // Headers not yet sent (Figma prep failed) — can still respond with JSON
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// ─── GitHub Repo Context ──────────────────────────────────────────────────

app.get('/api/repo/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const data = await getRepoContext(owner, repo);
    res.json(data);
  } catch (err) {
    console.error('Repo fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/repos', async (_req, res) => {
  try {
    res.json({ repos: await listUserRepos() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Active Objective ─────────────────────────────────────────────────────

app.get('/api/objective/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid objective ID' });

  try {
    const data = await getObjectiveWithContext(id);
    res.json(data);
  } catch (err) {
    console.error('Objective fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Active Epic ──────────────────────────────────────────────────────────

app.get('/api/epic/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid epic ID' });
  try {
    const [raw, allStories] = await Promise.all([getEpic(id), listStoriesForEpic(id)]);
    const stories = allStories.map((s) => ({
      id: s.id,
      name: s.name,
      story_type: s.story_type,
      estimate: s.estimate,
      completed: s.completed,
    }));
    res.json({ id: raw.id, name: raw.name, state: raw.state, stories });
  } catch (err) {
    console.error('Epic fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Create Artifacts ─────────────────────────────────────────────────────

app.post('/api/create/story', async (req, res) => {
  const { name, description, epic_id, estimate, story_type, workflow_state_id, external_links } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });

  try {
    const cache = loadCache();
    const story = await createStory({
      name,
      description: description || '',
      epic_id: epic_id || undefined,
      estimate: estimate || undefined,
      story_type: story_type || 'feature',
      workflow_state_id: workflow_state_id || cache?.default_workflow_state_id || undefined,
      ...(external_links?.length ? { external_links } : {}),
    });
    res.json({ ok: true, story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update/epic', async (req, res) => {
  const { id, description } = req.body;
  if (!id) return res.status(400).json({ error: '`id` is required' });

  try {
    const epic = await updateEpic(id, { description: description || '' });
    res.json({ ok: true, epic });
  } catch (err) {
    console.error('Update epic error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create/epic', async (req, res) => {
  const { name, description, objective_id } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });

  try {
    const epic = await createEpic({ name, description: description || '' });

    if (objective_id) {
      await updateEpic(epic.id, { objective_ids: [objective_id] });
    }

    res.json({ ok: true, epic });
  } catch (err) {
    console.error('Create epic error:', err);
    res.status(500).json({ error: err.message });
  }
});

function formatMilestoneEntry(name, description) {
  const stripped = description
    .replace(/^#+\s+.+\n*/m, '')
    .replace(/^-\s+\[[ x]\]\s+.+\n*/m, '')
    .trim();
  const indented = stripped
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : ''))
    .join('\n');
  return `- [ ] ${name}\n${indented}`;
}

function appendToMilestonesSection(currentDesc, milestoneEntry) {
  const MILESTONES_HEADER = '# MILESTONES';
  const COMMITTED_HEADER = '#### COMMITTED MILESTONES';
  const ENG_HEADER = '# ENGINEERING CONSIDERATIONS';

  if (currentDesc.includes(MILESTONES_HEADER)) {
    const anchor = currentDesc.includes(COMMITTED_HEADER) ? COMMITTED_HEADER : MILESTONES_HEADER;
    const anchorEnd = currentDesc.indexOf(anchor) + anchor.length;
    // Find the next ## or # section after the anchor to append before it
    const afterAnchor = currentDesc.slice(anchorEnd);
    const nextSection = afterAnchor.match(/\n#{1,2} /);
    if (nextSection) {
      const insertAt = anchorEnd + nextSection.index;
      return currentDesc.slice(0, insertAt).trimEnd() + '\n\n' + milestoneEntry + '\n\n' + currentDesc.slice(insertAt).trimStart();
    }
    return currentDesc.trimEnd() + '\n\n' + milestoneEntry;
  }
  // Insert before ENGINEERING CONSIDERATIONS if present, otherwise append
  if (currentDesc.includes(ENG_HEADER)) {
    const idx = currentDesc.indexOf(ENG_HEADER);
    return currentDesc.slice(0, idx).trimEnd() + '\n\n# MILESTONES\n#### COMMITTED MILESTONES\n\n' + milestoneEntry + '\n\n' + currentDesc.slice(idx);
  }
  return currentDesc.trimEnd() + '\n\n# MILESTONES\n#### COMMITTED MILESTONES\n\n' + milestoneEntry;
}

app.post('/api/create/milestone', async (req, res) => {
  const { name, description, objective_id } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });
  if (!objective_id) return res.status(400).json({ error: '`objective_id` is required — milestone must belong to an objective' });

  try {
    if (description) {
      const objective = await getObjective(objective_id);
      const currentDesc = objective.description || '';
      const milestoneEntry = formatMilestoneEntry(name, description);
      const newDesc = appendToMilestonesSection(currentDesc, milestoneEntry);
      await updateObjective(objective_id, { description: newDesc });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create/objective', async (req, res) => {
  const { name, description } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });

  try {
    const objective = await createObjective({ name, description: description || '' });
    res.json({ ok: true, objective });
  } catch (err) {
    console.error('Create objective error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────

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

const SETTINGS_KEYS = ['ANTHROPIC_API_KEY', 'SHORTCUT_API_TOKEN', 'GITHUB_TOKEN', 'FIGMA_API_TOKEN'];
const ENV_PATH = resolve(ROOT, '.env');

app.get('/api/settings', (_req, res) => {
  const raw = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
  const current = parseEnv(raw);
  const settings = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = { value: current.get(key) || '' };
  }
  res.json({ settings });
});

app.post('/api/settings', (req, res) => {
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

// ─── Reference Library ────────────────────────────────────────────────────

app.get('/api/reference-library', (_req, res) => {
  try {
    const configPath = resolve(ROOT, 'config.json');
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { reference_objective_ids: [] };

    // Enrich with names from cache
    const cache = getCacheStatus().exists
      ? JSON.parse(readFileSync(resolve(ROOT, 'context/cache.json'), 'utf-8'))
      : null;
    const nameMap = {};
    if (cache?.reference_objectives) {
      for (const ref of cache.reference_objectives) {
        nameMap[ref.id] = ref.title;
      }
    }

    const references = (config.reference_objective_ids || []).map((id) => ({
      id,
      name: nameMap[id] || null,
    }));

    res.json({ ...config, references });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reference-library/add', async (req, res) => {
  const { objective_id } = req.body;
  const id = parseInt(objective_id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid objective ID' });

  try {
    const configPath = resolve(ROOT, 'config.json');
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { reference_objective_ids: [] };

    if (!config.reference_objective_ids.includes(id)) {
      config.reference_objective_ids.push(id);
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    // Re-run bootstrap to fetch the new reference
    execSync(`node ${resolve(__dirname, 'bootstrap.js')}`, {
      cwd: ROOT,
      env: process.env,
      stdio: 'pipe',
    });

    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reference-library/remove', async (req, res) => {
  const { objective_id } = req.body;
  const id = parseInt(objective_id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid objective ID' });

  try {
    const configPath = resolve(ROOT, 'config.json');
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { reference_objective_ids: [] };

    config.reference_objective_ids = config.reference_objective_ids.filter((x) => x !== id);
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Rebuild cache without the removed reference
    execSync(`node ${resolve(__dirname, 'bootstrap.js')}`, {
      cwd: ROOT,
      env: process.env,
      stdio: 'pipe',
    });

    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🌱 Roots Product Helper backend running on http://localhost:${PORT}`);
  const status = getCacheStatus();
  if (!status.exists) {
    console.log('⚠️  No context cache found. Run `npm run bootstrap` to fetch team context.');
  } else if (status.is_stale) {
    console.log(`⚠️  Context cache is stale (last refreshed: ${status.refreshed_at}). Consider refreshing.`);
  } else {
    console.log(`✅ Context cache loaded (refreshed: ${status.refreshed_at})`);
  }
});
