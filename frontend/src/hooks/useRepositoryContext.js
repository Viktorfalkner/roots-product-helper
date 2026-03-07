import { useState } from 'react';

export function useRepositoryContext() {
  const [activeRepos, setActiveRepos] = useState([]);
  const [repoExpanded, setRepoExpanded] = useState(false);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState(null);
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [repoPickerList, setRepoPickerList] = useState(null);
  const [repoPickerLoading, setRepoPickerLoading] = useState(false);
  const [repoPickerError, setRepoPickerError] = useState(null);
  const [repoPickerSearch, setRepoPickerSearch] = useState('');
  const [starredRepos, setStarredRepos] = useState(() => {
    try {
      const saved = localStorage.getItem('starredRepos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['invest-with-roots/roots', 'invest-with-roots/bloom', 'invest-with-roots/grove-ui'];
  });

  function toggleStarRepo(full_name) {
    setStarredRepos((prev) => {
      const next = prev.includes(full_name) ? prev.filter((x) => x !== full_name) : [...prev, full_name];
      localStorage.setItem('starredRepos', JSON.stringify(next));
      return next;
    });
  }

  async function handleLoadRepo(owner, repo) {
    if (activeRepos.some((r) => r.owner === owner && r.repo === repo)) return;
    setLoadingRepo(true);
    setRepoError(null);
    setRepoPickerOpen(false);
    try {
      const res = await fetch(`/api/repo/${owner}/${repo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load repo');
      setActiveRepos((prev) => [...prev, data]);
    } catch (err) {
      setRepoError(err.message);
    } finally {
      setLoadingRepo(false);
    }
  }

  async function openRepoPicker() {
    setRepoPickerOpen(true);
    setRepoPickerSearch('');
    if (repoPickerList !== null) return;
    setRepoPickerLoading(true);
    setRepoPickerError(null);
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRepoPickerList(data.repos);
    } catch (err) {
      setRepoPickerError(err.message);
      setRepoPickerList([]);
    } finally {
      setRepoPickerLoading(false);
    }
  }

  return {
    activeRepos, setActiveRepos,
    repoExpanded, setRepoExpanded,
    loadingRepo, repoError, setRepoError,
    repoPickerOpen, setRepoPickerOpen,
    repoPickerList,
    repoPickerLoading,
    repoPickerError,
    repoPickerSearch, setRepoPickerSearch,
    starredRepos,
    handleLoadRepo,
    openRepoPicker,
    toggleStarRepo,
  };
}
