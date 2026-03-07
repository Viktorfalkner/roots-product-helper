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

import { chatStream, summarizeTranscript } from './claude.js';
import { extractFigmaLinks, parseFigmaLinks, fetchFigmaImages, fetchFigmaNodeContext } from './figma.js';
import { getCacheStatus } from './context.js';
import { getObjectiveWithContext, getEpic, listStoriesForEpic } from './shortcut.js';
import artifactsRouter from './routes/artifacts.js';
import githubRouter from './routes/github.js';
import { createSettingsRouter } from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Route Mounts ─────────────────────────────────────────────────────────

app.use(artifactsRouter);
app.use(githubRouter);
app.use(createSettingsRouter(resolve(ROOT, '.env')));

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
  const { messages, active_objective, transcript_summary, active_repos, model, active_epic, figma_urls, pasted_images, prd_text } = req.body;

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
      figmaContexts,
      prd_text || null
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
