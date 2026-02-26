#!/usr/bin/env node
/**
 * bootstrap.js — Fetches all context from Shortcut and writes context/cache.json
 * Run: node backend/src/bootstrap.js (or npm run bootstrap from root)
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

dotenv.config({ path: resolve(ROOT, '.env') });

import {
  getDocument,
  getObjective,
  listEpicsForObjective,
  listStoriesForEpic,
  listWorkflows,
} from './shortcut.js';

const DOC_IDS = {
  sdlc_sop: '685c2655-b99d-428b-be72-cfab2e2d44a2',
  story_template: '68408807-787a-463e-80cd-da0e87e1d725',
  epic_template: '685c577e-c55c-4831-8b79-d93d0d2e9a8d',
  objective_template: '685c648d-4009-489f-9a58-7e8a0965c2e4',
};

// Epics to pull as writing style examples for Heritage IRA objective
const HERITAGE_EPIC_NAMES = [
  'Heritage Onboarding Flow',
  'Heritage Fund Distribution & Functionality',
];

async function fetchDoc(docId, label) {
  console.log(`  Fetching ${label}...`);
  const doc = await getDocument(docId);
  return doc.content_markdown || doc.content || doc.text || '';
}

async function fetchReferenceObjective(objectiveId) {
  console.log(`  Fetching reference objective ${objectiveId}...`);
  const objective = await getObjective(objectiveId);

  console.log(`  Fetching epics for objective ${objectiveId}...`);
  let epics = [];
  try {
    epics = await listEpicsForObjective(objectiveId);
  } catch (e) {
    console.warn(`  Warning: could not fetch epics: ${e.message}`);
  }

  // Find the two representative epics by name (partial match)
  const targetEpics = epics.filter((e) =>
    HERITAGE_EPIC_NAMES.some((name) =>
      e.name.toLowerCase().includes(name.toLowerCase().split(' ')[1])
    )
  );

  // If we didn't find by name, just take the first two
  const sampleEpics = (targetEpics.length >= 2 ? targetEpics : epics).slice(0, 2);

  const epicsWithStories = await Promise.all(
    sampleEpics.map(async (epic) => {
      console.log(`    Fetching stories for epic "${epic.name}"...`);
      let stories = [];
      try {
        const allStories = await listStoriesForEpic(epic.id);
        stories = allStories.slice(0, 2).map((s) => ({
          name: s.name,
          description: s.description || '',
          story_type: s.story_type,
          estimate: s.estimate,
        }));
      } catch (e) {
        console.warn(`    Warning: could not fetch stories for epic ${epic.id}: ${e.message}`);
      }
      return {
        name: epic.name,
        description: epic.description || '',
        stories,
      };
    })
  );

  return {
    id: objective.id,
    title: objective.name,
    description: objective.description || '',
    epics: epicsWithStories,
  };
}

async function main() {
  console.log('🌱 Bootstrapping context cache...\n');

  // Read config for reference objective IDs
  const configPath = resolve(ROOT, 'config.json');
  let config = { reference_objective_ids: [15014] };
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  // Ensure context dir exists
  const contextDir = resolve(ROOT, 'context');
  if (!existsSync(contextDir)) mkdirSync(contextDir);

  // Fetch all docs in parallel
  const [sdlc_sop, story_template, epic_template, objective_template] =
    await Promise.all([
      fetchDoc(DOC_IDS.sdlc_sop, 'SDLC SOP'),
      fetchDoc(DOC_IDS.story_template, 'Story Template'),
      fetchDoc(DOC_IDS.epic_template, 'Epic Template'),
      fetchDoc(DOC_IDS.objective_template, 'Objective Template'),
    ]);

  // Fetch reference objectives
  console.log('\n  Fetching reference objectives...');
  const reference_objectives = [];
  for (const id of config.reference_objective_ids) {
    try {
      const ref = await fetchReferenceObjective(id);
      reference_objectives.push(ref);
    } catch (e) {
      console.warn(`  Warning: could not fetch reference objective ${id}: ${e.message}`);
    }
  }

  // Fetch default workflow state ID
  let default_workflow_state_id = null;
  try {
    console.log('\n  Fetching workflows...');
    const workflows = await listWorkflows();
    if (workflows.length > 0) {
      const defaultWorkflow = workflows[0];
      const unstartedState = defaultWorkflow.states?.find((s) => s.type === 'unstarted') || defaultWorkflow.states?.[0];
      if (unstartedState) {
        default_workflow_state_id = unstartedState.id;
        console.log(`  Default workflow: "${defaultWorkflow.name}" → state: "${unstartedState.name}" (ID: ${unstartedState.id})`);
      }
    }
  } catch (e) {
    console.warn(`  Warning: could not fetch workflows: ${e.message}`);
  }

  const cache = {
    refreshed_at: new Date().toISOString(),
    default_workflow_state_id,
    sdlc_sop,
    story_template,
    epic_template,
    objective_template,
    reference_objectives,
  };

  writeFileSync(resolve(contextDir, 'cache.json'), JSON.stringify(cache, null, 2));

  console.log('\n✅ Cache written to context/cache.json');
  console.log(`   Refreshed at: ${cache.refreshed_at}`);
  console.log(`   Reference objectives: ${reference_objectives.map((r) => r.title).join(', ')}`);
}

main().catch((err) => {
  console.error('\n❌ Bootstrap failed:', err.message);
  process.exit(1);
});
