import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SYSTEM_INTRO, PRD_TEMPLATE, CRITICAL_RULES } from './prompts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = resolve(__dirname, '../../context/cache.json');

export function loadCache() {
  if (!existsSync(CACHE_PATH)) return null;
  return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
}

export function getCacheStatus() {
  if (!existsSync(CACHE_PATH)) {
    return { exists: false, refreshed_at: null, is_stale: true };
  }
  const cache = loadCache();
  const refreshedAt = new Date(cache.refreshed_at);
  const ageMs = Date.now() - refreshedAt.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return {
    exists: true,
    refreshed_at: cache.refreshed_at,
    is_stale: ageMs > sevenDaysMs,
  };
}


/**
 * Static prompt — everything that never changes within a session.
 * This is the cacheable block: SOP, templates, reference objectives, rules.
 */
export function buildStaticPrompt(cache) {
  const sections = [];

  sections.push(SYSTEM_INTRO);

  if (cache.sdlc_sop) {
    sections.push(`## SDLC Process & SOP\n\n${cache.sdlc_sop}`);
  }

  if (cache.objective_template) {
    sections.push(`## Objective Template\n\nUse this structure when drafting objectives:\n\n${cache.objective_template}`);
  }

  if (cache.epic_template) {
    sections.push(`## Epic Template\n\nUse this structure when drafting epics:\n\n${cache.epic_template}`);
  }

  if (cache.story_template) {
    sections.push(`## Story Template\n\nUse this structure when drafting stories:\n\n${cache.story_template}`);
  }

  if (cache.reference_objectives && cache.reference_objectives.length > 0) {
    const refSection = cache.reference_objectives
      .map((ref) => {
        let text = `### Reference Objective: "${ref.title}"\n\n${ref.description}`;
        if (ref.epics && ref.epics.length > 0) {
          text += '\n\n**Sample Epics:**\n';
          ref.epics.forEach((epic) => {
            text += `\n#### Epic: "${epic.name}"\n${epic.description}`;
            if (epic.stories && epic.stories.length > 0) {
              text += '\n\n**Sample Stories:**\n';
              epic.stories.forEach((story) => {
                text += `\n- **${story.name}** (${story.estimate || '?'} pts)\n  ${story.description}`;
              });
            }
          });
        }
        return text;
      })
      .join('\n\n---\n\n');

    sections.push(`## Reference Objectives — Match This Quality and Structure\n\nThese are completed objectives from this team. Match their depth, structure, and writing style exactly.\n\n${refSection}`);
  }

  sections.push(`## PRD Template\n\nWhen generating a PRD, use this exact structure:\n\n${PRD_TEMPLATE}`);

  sections.push(CRITICAL_RULES);

  return sections.join('\n\n---\n\n');
}

/**
 * Dynamic context — changes per request (active objective, transcript summary).
 * Not cached — kept separate and small.
 */
export function buildDynamicContext(activeObjective = null, transcriptSummary = null, activeRepos = [], activeEpic = null) {
  const sections = [];

  if (transcriptSummary) {
    sections.push(`## Meeting Context

The following was extracted from a scoping meeting transcript. Use it to enrich your output — capture decisions made, fill in detail, and surface open questions that were raised.

${transcriptSummary}`);
  }

  if (activeRepos && activeRepos.length > 0) {
    const repoSections = activeRepos
      .map((r) => {
        const lines = [`**${r.full_name}**`];
        if (r.description) lines.push(r.description);
        if (r.readme) lines.push(`\nREADME (excerpt):\n${r.readme}`);
        if (r.open_prs.length > 0) {
          lines.push(`\nOpen PRs (${r.open_prs.length}):`);
          r.open_prs.forEach((pr) => lines.push(`- #${pr.number}: ${pr.title} (@${pr.user})`));
        }
        if (r.open_issues.length > 0) {
          lines.push(`\nOpen Issues (${r.open_issues.length}):`);
          r.open_issues.forEach((i) => lines.push(`- #${i.number}: ${i.title}`));
        }
        return lines.join('\n');
      })
      .join('\n\n');

    sections.push(`## GitHub Repository Context

The following repositories are relevant to this work. Use them to understand existing patterns, what's currently in flight, and avoid duplicating or conflicting with ongoing work.

${repoSections}`);
  }

  if (activeObjective) {
    sections.push(`## Active Objective — Current Working Context

You are currently working within this objective. Anchor all epics and stories to it. Do not duplicate what already exists.

**Objective ID:** ${activeObjective.id}
**Name:** ${activeObjective.name}
**State:** ${activeObjective.state?.type || 'unknown'}

**Description:**
${activeObjective.description || '(no description)'}

**Key Results / Milestones:**
${
  activeObjective.key_results && activeObjective.key_results.length > 0
    ? activeObjective.key_results
        .map((kr, i) => `${i + 1}. [ID: ${kr.id}] ${kr.name} — ${kr.type}`)
        .join('\n')
    : '(none defined)'
}

**Current Epics:**
${
  activeObjective.epics && activeObjective.epics.length > 0
    ? activeObjective.epics
        .map((epic) => {
          const storyCount = epic.stories?.length || 0;
          const completedStories = epic.stories?.filter((s) => s.completed)?.length || 0;
          return `- [ID: ${epic.id}] **${epic.name}** (${epic.state?.type || 'unknown'}) — ${completedStories}/${storyCount} stories done`;
        })
        .join('\n')
    : '(no epics yet)'
}`);
  }

  if (activeEpic) {
    const objectiveName = activeObjective?.name || 'unknown';
    sections.push(`## Active Epic — Focus Work Here

Break down work within this specific epic. All story drafts should target it.

**Epic ID:** ${activeEpic.id}
**Name:** ${activeEpic.name}
**Objective:** ${objectiveName}

Use this marker on every story draft: \`<!-- draft:story epic_id:${activeEpic.id} -->\``);
  }

  return sections.join('\n\n---\n\n');
}
