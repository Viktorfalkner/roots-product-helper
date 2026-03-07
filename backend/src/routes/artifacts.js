import { Router } from 'express';
import { loadCache } from '../context.js';
import { createStory, createEpic, updateEpic, createObjective, updateObjective, getObjective } from '../shortcut.js';
import { formatMilestoneEntry, appendToMilestonesSection } from '../utils/milestoneFormatter.js';

const router = Router();

router.post('/api/create/story', async (req, res) => {
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

router.post('/api/update/epic', async (req, res) => {
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

router.post('/api/create/epic', async (req, res) => {
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

router.post('/api/create/milestone', async (req, res) => {
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

router.post('/api/create/objective', async (req, res) => {
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

export default router;
