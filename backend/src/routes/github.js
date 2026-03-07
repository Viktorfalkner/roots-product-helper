import { Router } from 'express';
import { getRepoContext, listUserRepos } from '../github.js';

const router = Router();

router.get('/api/repo/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const data = await getRepoContext(owner, repo);
    res.json(data);
  } catch (err) {
    console.error('Repo fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/repos', async (_req, res) => {
  try {
    res.json({ repos: await listUserRepos() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
