import { useState, useRef, useMemo } from 'react';

export function useTranscriptContext() {
  const [transcripts, setTranscripts] = useState([]);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef(null);

  const transcriptSummary = useMemo(() => {
    if (transcripts.length === 0) return null;
    return transcripts
      .map((t, i) => `**Meeting ${i + 1}: ${t.name}**\n\n${t.summary ?? '(summarizing…)'}`)
      .join('\n\n---\n\n');
  }, [transcripts]);

  async function addTranscript(name, rawText) {
    const id = Date.now();
    setTranscripts((prev) => [...prev, { id, name, summary: null }]);
    try {
      const res = await fetch('/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: rawText }),
      });
      const data = await res.json();
      setTranscripts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, summary: data.summary } : t))
      );
    } catch {
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleFileUpload(file) {
    if (!file || !file.name.endsWith('.txt')) return;
    const text = await file.text();
    await addTranscript(file.name, text);
  }

  async function handlePasteLoad() {
    if (!pasteText.trim()) return;
    const name = `Pasted transcript ${transcripts.length + 1}`;
    setPasteText('');
    setShowPaste(false);
    await addTranscript(name, pasteText);
  }

  function reset() {
    setTranscripts([]);
    setShowPaste(false);
    setPasteText('');
  }

  return {
    transcripts, setTranscripts,
    transcriptExpanded, setTranscriptExpanded,
    showPaste, setShowPaste,
    pasteText, setPasteText,
    fileInputRef,
    transcriptSummary,
    addTranscript,
    handleFileUpload,
    handlePasteLoad,
    reset,
  };
}
