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

export async function getRepoContext(owner, repo) {
  const [repoData, prs, issues, readmeData] = await Promise.all([
    githubRequest(`/repos/${owner}/${repo}`),
    githubRequest(`/repos/${owner}/${repo}/pulls?state=open&per_page=10&sort=updated`),
    githubRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`),
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
