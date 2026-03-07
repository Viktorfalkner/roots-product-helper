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

  if (cache.objectives && cache.objectives.length > 0) {
    const list = cache.objectives.map((o) => `- [ID: ${o.id}] ${o.name}`).join('\n');
    sections.push(`## Available Objectives

When the user asks you to load, pull up, or switch to an objective, output this marker in your response (the UI will load it automatically):

\`<!-- context:objective id:NNN -->\`

Replace NNN with the ID from this list. Confirm what you're loading in plain text before the marker.

${list}`);
  }

  sections.push(CRITICAL_RULES);

  return sections.join('\n\n---\n\n');
}

/**
 * Dynamic context — changes per request (active objective, transcript summary).
 * Not cached — kept separate and small.
 */
export function buildDynamicContext(activeObjective = null, transcriptSummary = null, activeRepos = [], activeEpic = null, prdText = null) {
  const sections = [];

  // Current date + fiscal quarter (staggered calendar: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan)
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const calYear = now.getFullYear();
  let quarter, fiscalYear;
  if (month === 0)       { quarter = 'Q4'; fiscalYear = calYear - 1; } // Jan → Q4 of prior fiscal year
  else if (month <= 3)   { quarter = 'Q1'; fiscalYear = calYear; }     // Feb–Apr
  else if (month <= 6)   { quarter = 'Q2'; fiscalYear = calYear; }     // May–Jul
  else if (month <= 9)   { quarter = 'Q3'; fiscalYear = calYear; }     // Aug–Oct
  else                   { quarter = 'Q4'; fiscalYear = calYear; }     // Nov–Dec
  const fiscalQuarter = `${quarter}/${String(fiscalYear).slice(2)}`;
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  sections.push(`## Current Date & Fiscal Calendar
Today is ${dateStr} (${fiscalQuarter}).

This company uses a staggered fiscal calendar:
- Q1: February – April
- Q2: May – July
- Q3: August – October
- Q4: November – January

Always use the correct fiscal quarter when naming objectives (e.g. "[Q1/26] - Objective Name").`);

  if (prdText) {
    sections.push(`## Loaded PRD

The user has loaded the following Product Requirements Document. Use it as the source of truth for drafting objectives, milestones, epics, and stories. When asked to "draft an objective from the loaded PRD", produce a \`<!-- draft:objective -->\` card using this content.

${prdText}`);
  }

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
          const prs = r.open_prs.slice(0, 10);
          const prLabel = r.open_prs.length > 10 ? `Open PRs (${prs.length} of ${r.open_prs.length})` : `Open PRs (${r.open_prs.length})`;
          lines.push(`\n${prLabel}:`);
          prs.forEach((pr) => lines.push(`- #${pr.number}: ${pr.title} (@${pr.user})`));
        }
        if (r.open_issues.length > 0) {
          const issues = r.open_issues.slice(0, 10);
          const issueLabel = r.open_issues.length > 10 ? `Open Issues (${issues.length} of ${r.open_issues.length})` : `Open Issues (${r.open_issues.length})`;
          lines.push(`\n${issueLabel}:`);
          issues.forEach((i) => lines.push(`- #${i.number}: ${i.title}`));
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
    const storiesText =
      activeEpic.stories && activeEpic.stories.length > 0
        ? activeEpic.stories
            .map((s) => {
              const status = s.completed ? '✓' : '○';
              const pts = s.estimate ? ` (${s.estimate}pt)` : '';
              return `  ${status} [ID: ${s.id}] ${s.name}${pts} — ${s.story_type}`;
            })
            .join('\n')
        : '  (no stories yet)';

    sections.push(`## Active Epic — Focus Work Here

Break down work within this specific epic. All story drafts should target it.

**Epic ID:** ${activeEpic.id}
**Name:** ${activeEpic.name}
**Objective:** ${objectiveName}

**Stories (${activeEpic.stories?.length || 0} total):**
${storiesText}

Use this marker on every story draft: \`<!-- draft:story epic_id:${activeEpic.id} -->\``);
  }

  return sections.join('\n\n---\n\n');
}
