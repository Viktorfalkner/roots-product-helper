import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getToken() {
  const token = process.env.SHORTCUT_API_TOKEN;
  if (!token) throw new Error('SHORTCUT_API_TOKEN is not set');
  return token;
}

async function shortcutRequest(path, method = 'GET', body = null) {
  const url = `https://api.app.shortcut.com/api/v3${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Shortcut-Token': getToken(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shortcut API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Documents ---

export async function getDocument(docId) {
  return shortcutRequest(`/documents/${docId}`);
}

// --- Objectives ---

export async function getObjective(id) {
  return shortcutRequest(`/objectives/${id}`);
}

export async function createObjective(payload) {
  return shortcutRequest('/objectives', 'POST', payload);
}

// --- Epics ---

export async function getEpic(id) {
  return shortcutRequest(`/epics/${id}`);
}

export async function listEpicsForObjective(objectiveId) {
  const results = await shortcutRequest(`/objectives/${objectiveId}/epics`);
  return Array.isArray(results) ? results : [];
}

export async function createEpic(payload) {
  return shortcutRequest('/epics', 'POST', payload);
}

export async function updateEpic(id, payload) {
  return shortcutRequest(`/epics/${id}`, 'PUT', payload);
}

// --- Key Results / Milestones ---

export async function createKeyResult(objectiveId, name) {
  return shortcutRequest(`/objectives/${objectiveId}/key-results`, 'POST', {
    name,
    type: 'boolean',
  });
}

export async function updateObjective(id, payload) {
  return shortcutRequest(`/objectives/${id}`, 'PUT', payload);
}

// --- Stories ---

export async function listStoriesForEpic(epicId) {
  return shortcutRequest(`/epics/${epicId}/stories`);
}

export async function createStory(payload) {
  return shortcutRequest('/stories', 'POST', payload);
}

// --- Workflows ---

export async function listWorkflows() {
  return shortcutRequest('/workflows');
}

// --- Full objective context (for active session) ---

export async function getObjectiveWithContext(objectiveId) {
  const objective = await getObjective(objectiveId);

  // Fetch epics linked to this objective (exclude archived)
  let epics = [];
  try {
    const allEpics = await listEpicsForObjective(objectiveId);
    epics = allEpics.filter((e) => !e.archived);
  } catch (e) {
    console.warn('Could not fetch epics for objective:', e.message);
  }

  // For each epic, fetch a sample of its stories
  const epicsWithStories = await Promise.all(
    epics.map(async (epic) => {
      let stories = [];
      try {
        const allStories = await listStoriesForEpic(epic.id);
        stories = allStories.slice(0, 10).map((s) => ({
          id: s.id,
          name: s.name,
          story_type: s.story_type,
          estimate: s.estimate,
          workflow_state_id: s.workflow_state_id,
          completed: s.completed,
        }));
      } catch (e) {
        console.warn(`Could not fetch stories for epic ${epic.id}:`, e.message);
      }
      return {
        id: epic.id,
        name: epic.name,
        state: epic.state,
        description: epic.description,
        completed: epic.completed,
        stories,
      };
    })
  );

  return {
    id: objective.id,
    name: objective.name,
    description: objective.description,
    state: objective.state,
    key_results: objective.key_results || [],
    epics: epicsWithStories,
  };
}
