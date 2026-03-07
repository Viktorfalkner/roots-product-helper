// Single-match regex — captures slug (group 3) and nodeId (group 4)
// Used by parseFigmaInput for URL validation and label generation.
export const FIGMA_URL_RE = /https:\/\/www\.figma\.com\/(file|design)\/([a-zA-Z0-9]+)\/([^?#\s]*)\?[^#\s]*node-id=([^&\s#]+)/;

export function parseFigmaInput(input) {
  const trimmed = input.trim();
  const match = trimmed.match(FIGMA_URL_RE);
  if (!match) return null;
  const slug = decodeURIComponent(match[3]).replace(/-/g, ' ').trim();
  const nodeId = decodeURIComponent(match[4]);
  const label = slug ? `${slug} — ${nodeId}` : nodeId;
  return { url: trimmed, label };
}

// Global regex for extracting all Figma URLs from a block of text.
const FIGMA_URL_GLOBAL_RE = /https:\/\/www\.figma\.com\/(file|design)\/([a-zA-Z0-9]+)\/[^?\s]*\?[^#\s]*node-id=([^&\s#]+)/g;

export function extractFigmaUrls(text) {
  if (!text) return [];
  FIGMA_URL_GLOBAL_RE.lastIndex = 0;
  const urls = [];
  let match;
  while ((match = FIGMA_URL_GLOBAL_RE.exec(text)) !== null) {
    urls.push(match[0]);
  }
  return urls;
}
