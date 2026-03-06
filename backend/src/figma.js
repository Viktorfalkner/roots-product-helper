const FIGMA_URL_RE = /https:\/\/www\.figma\.com\/(file|design)\/([a-zA-Z0-9]+)\/[^?\s]*\?[^#\s]*node-id=([^&\s#]+)/g;

/**
 * Parse a single Figma URL into { fileKey, nodeId } or null.
 * Node IDs come in two forms from URLs: "1234-5678" or "1234%3A5678".
 * The Figma images API expects "1234:5678".
 */
export function parseFigmaUrl(url) {
  FIGMA_URL_RE.lastIndex = 0;
  const match = FIGMA_URL_RE.exec(url);
  if (!match) return null;
  const fileKey = match[2];
  const rawNodeId = match[3];
  const nodeId = decodeURIComponent(rawNodeId).replace(/-/g, ':');
  return { fileKey, nodeId };
}

/**
 * Parse an array of Figma URL strings into [{ url, fileKey, nodeId }].
 * Same output shape as extractFigmaLinks but takes explicit URLs instead of text.
 */
export function parseFigmaLinks(urls) {
  if (!urls?.length) return [];
  const seen = new Set();
  return urls
    .map((url) => {
      if (seen.has(url)) return null;
      const parsed = parseFigmaUrl(url);
      if (!parsed) return null;
      seen.add(url);
      return { url, ...parsed };
    })
    .filter(Boolean);
}

/**
 * Extract all Figma frame links from a block of text.
 * Returns [{ url, fileKey, nodeId }]
 */
export function extractFigmaLinks(text) {
  if (!text) return [];
  FIGMA_URL_RE.lastIndex = 0;
  const results = [];
  const seen = new Set();
  let match;
  while ((match = FIGMA_URL_RE.exec(text)) !== null) {
    const url = match[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const fileKey = match[2];
    const rawNodeId = match[3];
    const nodeId = decodeURIComponent(rawNodeId).replace(/-/g, ':');
    results.push({ url, fileKey, nodeId });
  }
  return results;
}

/**
 * Fetch rendered PNG images for a list of Figma links.
 * Returns [{ url, base64, mediaType: 'image/png' }]
 *
 * Skips gracefully if FIGMA_API_TOKEN is not set.
 */
export async function fetchFigmaImages(links) {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) {
    console.warn('[figma] FIGMA_API_TOKEN not set — skipping image fetch');
    return [];
  }
  if (!links || links.length === 0) return [];

  const results = [];

  // Group links by fileKey to batch API calls
  const byFile = new Map();
  for (const link of links) {
    if (!byFile.has(link.fileKey)) byFile.set(link.fileKey, []);
    byFile.get(link.fileKey).push(link);
  }

  for (const [fileKey, fileLinks] of byFile.entries()) {
    const ids = fileLinks.map((l) => l.nodeId).join(',');
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=0.5`;

    let imageMap;
    try {
      const res = await fetch(apiUrl, {
        headers: { 'X-Figma-Token': token },
      });
      if (!res.ok) {
        console.warn(`[figma] Figma API error for file ${fileKey}: ${res.status} ${res.statusText}`);
        continue;
      }
      const json = await res.json();
      imageMap = json.images || {};
    } catch (err) {
      console.warn(`[figma] Failed to call Figma API for file ${fileKey}:`, err.message);
      continue;
    }

    for (const link of fileLinks) {
      const s3Url = imageMap[link.nodeId];
      if (!s3Url) {
        console.warn(`[figma] No image returned for node ${link.nodeId} in file ${fileKey}`);
        continue;
      }
      try {
        const imgRes = await fetch(s3Url);
        if (!imgRes.ok) {
          console.warn(`[figma] Failed to fetch image from S3: ${imgRes.status}`);
          continue;
        }
        const buffer = await imgRes.arrayBuffer();
        const buf = Buffer.from(buffer);

        // PNG stores width at bytes 16-19, height at 20-23 (big-endian)
        if (buf.length >= 24) {
          const width = buf.readUInt32BE(16);
          const height = buf.readUInt32BE(20);
          if (width > 7500 || height > 7500) {
            console.warn(`[figma] Image for node ${link.nodeId} too large (${width}x${height}px) — skipping visual, node context still available`);
            continue;
          }
        }

        const base64 = buf.toString('base64');
        results.push({ url: link.url, base64, mediaType: 'image/png' });
      } catch (err) {
        console.warn(`[figma] Failed to fetch S3 image for node ${link.nodeId}:`, err.message);
      }
    }
  }

  return results;
}

/**
 * Fetch frame name and immediate child names for a list of Figma links.
 * Uses the /files/:key/nodes endpoint to get semantic structure — not pixels.
 * Returns [{ url, nodeId, name, type, children: [string] }]
 *
 * This gives Claude the "what is this flow called and what screens are in it"
 * context that a rendered image alone cannot convey.
 */
export async function fetchFigmaNodeContext(links) {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token || !links?.length) return [];

  const results = [];

  const byFile = new Map();
  for (const link of links) {
    if (!byFile.has(link.fileKey)) byFile.set(link.fileKey, []);
    byFile.get(link.fileKey).push(link);
  }

  for (const [fileKey, fileLinks] of byFile.entries()) {
    const ids = fileLinks.map((l) => l.nodeId).join(',');
    const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`;

    let nodesData;
    try {
      const res = await fetch(apiUrl, {
        headers: { 'X-Figma-Token': token },
      });
      if (!res.ok) {
        console.warn(`[figma] Nodes API error for file ${fileKey}: ${res.status} ${res.statusText}`);
        continue;
      }
      const json = await res.json();
      nodesData = json.nodes || {};
    } catch (err) {
      console.warn(`[figma] Failed to call Figma Nodes API for file ${fileKey}:`, err.message);
      continue;
    }

    for (const link of fileLinks) {
      const nodeData = nodesData[link.nodeId];
      if (!nodeData?.document) continue;

      const doc = nodeData.document;
      const children = (doc.children || [])
        .map((c) => c.name)
        .filter(Boolean)
        .slice(0, 20); // cap at 20 to avoid token bloat

      results.push({
        url: link.url,
        nodeId: link.nodeId,
        name: doc.name,
        type: doc.type,
        children,
      });
    }
  }

  return results;
}
