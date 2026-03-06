function getToken() {
  return process.env.GITHUB_TOKEN || null;
}

async function githubRequest(path) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`);
  return res.json();
}

export async function listUserRepos() {
  const token = getToken();
  if (!token) throw new Error('No GITHUB_TOKEN configured');
  const all = [];
  let page = 1;
  while (page <= 3) {
    const batch = await githubRequest(
      `/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member&page=${page}`
    );
    for (const r of batch) {
      all.push({ full_name: r.full_name, owner: r.owner.login, repo: r.name, description: r.description || null, private: r.private });
    }
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

export async function getRepoContext(owner, repo) {
  const [repoData, prs, issues, readmeData] = await Promise.all([
    githubRequest(`/repos/${owner}/${repo}`),
    githubRequest(`/repos/${owner}/${repo}/pulls?state=open&per_page=10&sort=updated`).catch(() => []),
    githubRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`).catch(() => []),
    githubRequest(`/repos/${owner}/${repo}/readme`).catch(() => null),
  ]);

  let readme = null;
  if (readmeData?.content) {
    const full = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    readme = full.slice(0, 800);
  }

  return {
    owner,
    repo,
    full_name: repoData.full_name,
    description: repoData.description || null,
    readme,
    open_prs: prs.slice(0, 10).map((pr) => ({
      number: pr.number,
      title: pr.title,
      user: pr.user?.login,
    })),
    open_issues: issues
      .filter((i) => !i.pull_request)
      .slice(0, 10)
      .map((i) => ({ number: i.number, title: i.title })),
  };
}
