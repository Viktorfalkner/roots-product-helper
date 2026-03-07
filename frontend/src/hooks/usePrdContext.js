import { useState, useRef } from 'react';

export function usePrdContext() {
  const [prdText, setPrdText] = useState('');
  const [prdFileName, setPrdFileName] = useState(null);
  const [prdExpanded, setPrdExpanded] = useState(false);
  const [pendingPrd, setPendingPrd] = useState(null);
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
    setPendingPrd('Draft an objective from the loaded PRD.');
    setPrdExpanded(false);
  }

  return {
    prdText, setPrdText,
    prdFileName, setPrdFileName,
    prdExpanded, setPrdExpanded,
    pendingPrd, setPendingPrd,
    prdPasteInput, setPrdPasteInput,
    prdFileInputRef,
    handlePrdFileUpload,
    handleConvertPrd,
  };
}
