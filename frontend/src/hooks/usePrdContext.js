import { useState, useRef } from 'react';

export function usePrdContext() {
  const [prdText, setPrdText] = useState('');
  const [prdFileName, setPrdFileName] = useState(null);
  const [prdExpanded, setPrdExpanded] = useState(false);
  const [pendingPrd, setPendingPrd] = useState(null);
  const [prdShowPaste, setPrdShowPaste] = useState(false);
  const [prdPasteInput, setPrdPasteInput] = useState('');
  const prdFileInputRef = useRef(null);

  async function handlePrdFileUpload(file) {
    if (!file) return;
    const text = await file.text();
    setPrdText(text);
    setPrdFileName(file.name);
    setPrdExpanded(true);
  }

  function handleConvertPrd() {
    if (!prdText.trim()) return;
    const prompt = `Convert the following PRD into a complete objective using our objective template and writing style. Match the depth and structure of the reference objectives.\n\n---\n\n${prdText.trim()}`;
    setPendingPrd(prompt);
    setPrdText('');
    setPrdFileName(null);
    setPrdExpanded(false);
  }

  return {
    prdText, setPrdText,
    prdFileName, setPrdFileName,
    prdExpanded, setPrdExpanded,
    pendingPrd, setPendingPrd,
    prdShowPaste, setPrdShowPaste,
    prdPasteInput, setPrdPasteInput,
    prdFileInputRef,
    handlePrdFileUpload,
    handleConvertPrd,
  };
}
