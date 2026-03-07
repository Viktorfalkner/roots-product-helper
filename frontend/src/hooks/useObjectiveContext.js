import { useState, useEffect } from 'react';

function parseObjectiveId(input) {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/objectives?\/(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  return null;
}

export function useObjectiveContext() {
  const [objectiveInput, setObjectiveInput] = useState('');
  const [activeObjective, setActiveObjective] = useState(null);
  const [loadingObjective, setLoadingObjective] = useState(false);
  const [objectiveError, setObjectiveError] = useState(null);
  const [activeEpic, setActiveEpic] = useState(null);
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    setActiveEpic(null);
    setActiveStory(null);
  }, [activeObjective]);

  useEffect(() => {
    setActiveStory(null);
  }, [activeEpic]);

  async function handleLoadObjective() {
    const id = parseObjectiveId(objectiveInput);
    if (!id) {
      setObjectiveError('Enter a valid Shortcut objective ID or URL');
      return;
    }

    setLoadingObjective(true);
    setObjectiveError(null);

    try {
      const res = await fetch(`/api/objective/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load objective');
      setActiveObjective(data);
      setObjectiveInput('');
    } catch (err) {
      setObjectiveError(err.message);
    } finally {
      setLoadingObjective(false);
    }
  }

  return {
    objectiveInput, setObjectiveInput,
    activeObjective, setActiveObjective,
    loadingObjective,
    objectiveError, setObjectiveError,
    activeEpic, setActiveEpic,
    activeStory, setActiveStory,
    handleLoadObjective,
  };
}
