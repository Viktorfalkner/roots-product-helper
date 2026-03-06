import Anthropic from '@anthropic-ai/sdk';
import { loadCache, buildStaticPrompt, buildDynamicContext } from './context.js';
import { TRANSCRIPT_SYSTEM_PROMPT, transcriptExtractionPrompt } from './prompts.js';

/**
 * Send a chat message to Claude with full context injected.
 *
 * Static context (SOP, templates, reference objectives) is marked for prompt
 * caching. After the first call in a session, Anthropic caches this block and
 * subsequent turns pay ~10% of the normal input token cost for it.
 *
 * Dynamic context (active objective, transcript summary) is small and changes
 * per request — not cached.
 *
 * @param {Array} messages - Conversation history: [{role, content}]
 * @param {Object|null} activeObjective - Live objective context from Shortcut
 * @param {string|null} transcriptSummary - Pre-summarized meeting transcript
 */
export async function chat(messages, activeObjective = null, transcriptSummary = null, activeRepos = [], model = 'claude-opus-4-6', activeEpic = null, figmaImages = [], figmaContexts = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const cache = loadCache();
  if (!cache) {
    throw new Error(
      'Context cache is empty. Run `npm run bootstrap` first to fetch your team context.'
    );
  }

  const staticPrompt = buildStaticPrompt(cache);
  const dynamicContext = buildDynamicContext(activeObjective, transcriptSummary, activeRepos, activeEpic);

  // Build the system array. Static block is marked for caching — Anthropic
  // stores it for 5 minutes (TTL resets on each use), so a normal back-and-forth
  // session pays the cache write cost once and ~10% on every subsequent turn.
  const systemBlocks = [
    {
      type: 'text',
      text: staticPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ];

  if (dynamicContext) {
    systemBlocks.push({
      type: 'text',
      text: dynamicContext,
    });
  }

  // If Figma content is present, transform the last user message into a
  // multimodal content array: node context text first, then images, then the user text.
  let finalMessages = messages;
  if ((figmaImages && figmaImages.length > 0) || (figmaContexts && figmaContexts.length > 0)) {
    finalMessages = [...messages];
    const last = finalMessages[finalMessages.length - 1];
    if (last && last.role === 'user') {
      const textContent = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
      const contentBlocks = [];

      // Inject node context as a structured text block so Claude understands the flow semantics
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

      // Add rendered images
      for (const img of figmaImages) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
        });
      }

      contentBlocks.push({ type: 'text', text: textContent });

      finalMessages[finalMessages.length - 1] = {
        ...last,
        content: contentBlocks,
      };
    }
  }

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemBlocks,
    messages: finalMessages,
  });

  return response.content[0].text;
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
