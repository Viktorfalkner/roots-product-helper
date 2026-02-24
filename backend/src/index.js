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

import { chat, summarizeTranscript } from './claude.js';
import { getCacheStatus } from './context.js';
import { getRepoContext } from './github.js';
import {
  getObjectiveWithContext,
  createStory,
  createEpic,
  createObjective,
  createKeyResult,
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
  const { messages, active_objective, transcript_summary, active_repos, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '`messages` array is required' });
  }

  const selectedModel = ALLOWED_MODELS.has(model) ? model : 'claude-opus-4-6';

  try {
    const response = await chat(messages, active_objective || null, transcript_summary || null, active_repos || [], selectedModel);
    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
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

// ─── Create Artifacts ─────────────────────────────────────────────────────

app.post('/api/create/story', async (req, res) => {
  const { name, description, epic_id, estimate, story_type } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });

  try {
    const story = await createStory({
      name,
      description: description || '',
      epic_id: epic_id || undefined,
      estimate: estimate || undefined,
      story_type: story_type || 'feature',
    });
    res.json({ ok: true, story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create/epic', async (req, res) => {
  const { name, description, objective_id } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });

  try {
    const payload = { name, description: description || '' };
    if (objective_id) payload.objective_id = objective_id;
    const epic = await createEpic(payload);
    res.json({ ok: true, epic });
  } catch (err) {
    console.error('Create epic error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create/milestone', async (req, res) => {
  const { name, objective_id } = req.body;

  if (!name) return res.status(400).json({ error: '`name` is required' });
  if (!objective_id) return res.status(400).json({ error: '`objective_id` is required — milestone must belong to an objective' });

  try {
    const key_result = await createKeyResult(objective_id, name);
    res.json({ ok: true, key_result });
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
