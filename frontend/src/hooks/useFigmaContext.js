import { useState } from 'react';
import { parseFigmaInput } from '../lib/figmaUtils.js';

export function useFigmaContext() {
  const [figmaLinks, setFigmaLinks] = useState([]);
  const [figmaInput, setFigmaInput] = useState('');
  const [figmaExpanded, setFigmaExpanded] = useState(false);
  const [figmaError, setFigmaError] = useState(null);

  function handleAddFigmaLink() {
    const parsed = parseFigmaInput(figmaInput);
    if (!parsed) { setFigmaError('Paste a Figma URL with a node-id'); return; }
    if (figmaLinks.some((l) => l.url === parsed.url)) { setFigmaError('Already added'); return; }
    setFigmaLinks((prev) => [...prev, parsed]);
    setFigmaInput('');
    setFigmaError(null);
  }

  return {
    figmaLinks, setFigmaLinks,
    figmaInput, setFigmaInput,
    figmaExpanded, setFigmaExpanded,
    figmaError, setFigmaError,
    handleAddFigmaLink,
  };
}
