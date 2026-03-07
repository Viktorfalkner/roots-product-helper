import Anthropic from '@anthropic-ai/sdk';
import { loadCache, buildStaticPrompt, buildDynamicContext } from './context.js';
import { TRANSCRIPT_SYSTEM_PROMPT, transcriptExtractionPrompt } from './prompts.js';

/**
 * Shared payload builder — assembles system blocks and final message array
 * (including multimodal Figma transform) for both chat() and chatStream().
 */
function buildApiPayload(messages, activeObjective, transcriptSummary, activeRepos, activeEpic, figmaImages, figmaContexts) {
  const cache = loadCache();
  if (!cache) {
    throw new Error(
      'Context cache is empty. Run `npm run bootstrap` first to fetch your team context.'
    );
  }

  const staticPrompt = buildStaticPrompt(cache);
  const dynamicContext = buildDynamicContext(activeObjective, transcriptSummary, activeRepos, activeEpic);

  // Static block is marked for caching — Anthropic stores it for 5 minutes,
  // so a normal back-and-forth session pays the write cost once and ~10% after.
  const systemBlocks = [
    {
      type: 'text',
      text: staticPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ];

  if (dynamicContext) {
    // Cache the dynamic context too — if the active objective/epic/repos haven't
    // changed between turns (the common case), this block is identical and hits cache.
    systemBlocks.push({ type: 'text', text: dynamicContext, cache_control: { type: 'ephemeral' } });
  }

  // Cap message history at 40 messages (20 turns) to prevent unbounded token growth.
  // Users can always restore older context from chat history if needed.
  const MAX_MESSAGES = 40;
  let finalMessages = messages.length > MAX_MESSAGES
    ? messages.slice(messages.length - MAX_MESSAGES)
    : [...messages];
  if ((figmaImages && figmaImages.length > 0) || (figmaContexts && figmaContexts.length > 0)) {
    finalMessages = [...finalMessages];
    const last = finalMessages[finalMessages.length - 1];
    if (last && last.role === 'user') {
      const textContent = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
      const contentBlocks = [];

      if (figmaContexts && figmaContexts.length > 0) {
        const contextText = figmaContexts
          .map((ctx) => {
            const childList = ctx.children.length > 0
              ? `\nLayers/sections:\n${ctx.children.map((c) => `  - ${c}`).join('\n')}`
              : '';
            return `Frame: "${ctx.name}" (type: ${ctx.type})${childList}`;
          })
          .join('\n\n');
        contentBlocks.push({
          type: 'text',
          text: `[Figma Design Context]\n${contextText}`,
        });
      }

      for (const img of figmaImages) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
        });
      }

      contentBlocks.push({ type: 'text', text: textContent });

      finalMessages[finalMessages.length - 1] = { ...last, content: contentBlocks };
    }
  }

  // Cache message history up to the third-from-last message.
  // The last 2 turns stay uncached (always fresh). Everything before that is
  // identical on the next request and hits cache — the biggest saving in long sessions.
  if (finalMessages.length >= 4) {
    const idx = finalMessages.length - 3;
    const msg = finalMessages[idx];
    const blocks = typeof msg.content === 'string'
      ? [{ type: 'text', text: msg.content }]
      : [...msg.content];
    blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: 'ephemeral' } };
    finalMessages = finalMessages.map((m, i) => i === idx ? { ...m, content: blocks } : m);
  }

  return { systemBlocks, finalMessages };
}

/**
 * Send a chat message and await the full response (non-streaming).
 * Kept for any internal callers that need a plain string back.
 */
export async function chat(messages, activeObjective = null, transcriptSummary = null, activeRepos = [], model = 'claude-opus-4-6', activeEpic = null, figmaImages = [], figmaContexts = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { systemBlocks, finalMessages } = buildApiPayload(messages, activeObjective, transcriptSummary, activeRepos, activeEpic, figmaImages, figmaContexts);

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemBlocks,
    messages: finalMessages,
  });

  return response.content[0].text;
}

/**
 * Send a chat message and return a live stream.
 * The caller attaches .on('text', fn), .on('finalMessage', fn), .on('error', fn).
 * Call stream.abort() to cancel.
 */
export async function chatStream(messages, activeObjective = null, transcriptSummary = null, activeRepos = [], model = 'claude-opus-4-6', activeEpic = null, figmaImages = [], figmaContexts = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { systemBlocks, finalMessages } = buildApiPayload(messages, activeObjective, transcriptSummary, activeRepos, activeEpic, figmaImages, figmaContexts);

  return client.messages.stream({
    model,
    max_tokens: 8192,
    system: systemBlocks,
    messages: finalMessages,
  });
}

/**
 * Summarize a raw meeting transcript using Haiku (cheap + fast).
 * Extracts: decisions made, problems discussed, open questions, scope signals.
 * The summary replaces the raw transcript as session context for Opus calls.
 */
export async function summarizeTranscript(rawTranscript) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: TRANSCRIPT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: transcriptExtractionPrompt(rawTranscript),
      },
    ],
  });

  return response.content[0].text;
}
