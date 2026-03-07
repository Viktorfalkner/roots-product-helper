# Roots Product Helper — Project CLAUDE.md

## Stack

- **Backend:** Node.js / Express (ESM, `"type": "module"`)
- **Frontend:** React 18 + Vite
- **AI:** Claude API via `@anthropic-ai/sdk` (claude-opus-4-6)
- **Project management:** Shortcut REST API v3

---

## Architecture

```
roots-product-helper/
├── backend/src/
│   ├── index.js                   # Express server + route mounts. Owns: health, context-status, bootstrap,
│   │                              #   chat (SSE), summarize-transcript, objective/:id, epic/:id,
│   │                              #   reference-library CRUD
│   ├── claude.js                  # Claude API client — buildApiPayload(), chatStream(), chat(),
│   │                              #   summarizeTranscript(). Handles Figma multimodal transform,
│   │                              #   prompt caching (3 ephemeral blocks), and message history cap.
│   ├── context.js                 # Cache reader + system prompt builder.
│   │                              #   loadCache(), getCacheStatus(), buildStaticPrompt(), buildDynamicContext()
│   ├── prompts.js                 # ALL prompt strings — single source of truth.
│   │                              #   SYSTEM_INTRO, PRD_TEMPLATE, CRITICAL_RULES,
│   │                              #   TRANSCRIPT_SYSTEM_PROMPT, transcriptExtractionPrompt()
│   ├── shortcut.js                # Shortcut REST client (all API calls).
│   │                              #   getObjective, listEpicsForObjective, createStory, createEpic,
│   │                              #   updateEpic, createObjective, createKeyResult, listWorkflows, etc.
│   ├── bootstrap.js               # Fetches Shortcut docs + reference objectives → writes context/cache.json.
│   │                              #   Run via: npm run bootstrap
│   ├── figma.js                   # Figma API client.
│   │                              #   extractFigmaLinks(), parseFigmaLinks(), fetchFigmaImages(),
│   │                              #   fetchFigmaNodeContext()
│   ├── routes/
│   │   ├── artifacts.js           # POST /api/create/story|epic|milestone|objective
│   │   │                          # POST /api/update/epic
│   │   ├── github.js              # GET /api/repos, GET /api/repo/:owner/:repo
│   │   └── settings.js            # GET/POST /api/settings (reads/writes .env)
│   └── utils/
│       └── milestoneFormatter.js  # Pure fns: formatMilestoneEntry(), appendToMilestonesSection()
│
├── frontend/src/
│   ├── App.jsx                    # Layout shell + wiring. Owns: messages, model, chatFigmaLinks.
│   │                              #   Calls all six hooks, renders sidebar + Chat.
│   ├── main.jsx                   # React entry point
│   ├── components/
│   │   ├── Chat.jsx               # Message thread + input + SSE stream handler
│   │   ├── Message.jsx            # Parses draft markers → DraftCards; strips context signal markers
│   │   ├── DraftCard.jsx          # Renders draft artifact + "Create in Shortcut" CTA
│   │   ├── CollapsibleSection.jsx # Reusable expand/collapse sidebar section (used 4× in App.jsx)
│   │   ├── ContextBadge.jsx       # Cache freshness indicator (green / stale)
│   │   ├── ObjectivePanel.jsx     # Active objective → epics list in sidebar
│   │   ├── EpicPanel.jsx          # Active epic → stories list in sidebar
│   │   ├── StoryPanel.jsx         # Active story detail in sidebar
│   │   ├── MilestoneRow.jsx       # Single milestone row inside ObjectivePanel
│   │   ├── ReferenceLibrary.jsx   # Reference objectives sidebar panel
│   │   ├── RepoPicker.jsx         # Modal to select GitHub repos for context
│   │   ├── ChatHistoryPanel.jsx   # Saved chat list sidebar panel
│   │   ├── Settings.jsx           # Settings modal (token management)
│   │   └── SidebarButton.jsx      # Shared sidebar button style
│   ├── hooks/
│   │   ├── useObjectiveContext.js # objective/epic/story load + active state
│   │   ├── useRepositoryContext.js# repo picker, starred repos, active repos list
│   │   ├── useTranscriptContext.js# transcript upload/paste + Haiku summarization
│   │   ├── usePrdContext.js       # PRD upload/paste + convert-to-objective flow
│   │   ├── useFigmaContext.js     # Figma link add/remove + link state
│   │   └── useChatHistory.js      # Saved chat CRUD — accepts messages as param (see Key Conventions)
│   └── lib/
│       ├── draftConstants.js      # DRAFT_MARKERS, DRAFT_TYPES, DRAFT_TYPE_COLORS, SHORTCUT_ENDPOINTS
│       ├── figmaUtils.js          # FIGMA_URL_RE — shared between App.jsx and Chat.jsx
│       └── chatHistory.js         # localStorage helpers: saveChat, listChats, loadChat, deleteChat
│
├── context/
│   └── cache.json                 # Gitignored — written by bootstrap.js, read by context.js
├── config.json                    # { reference_objective_ids: [...] } — controls what bootstrap fetches
└── .env                           # ANTHROPIC_API_KEY, SHORTCUT_API_TOKEN, GITHUB_TOKEN, FIGMA_API_TOKEN, PORT
```

---

## Key Data Flows

**Bootstrap → Cache → System Prompt**
`bootstrap.js` fetches from Shortcut: SDLC SOP, story/epic/objective templates, reference objectives with sample epics/stories, full objectives list, default workflow state ID. Writes all of it to `context/cache.json`. On each chat request, `context.js` assembles the system prompt: `buildStaticPrompt()` (cacheable block — SOP + templates + reference objectives + rules) + `buildDynamicContext()` (per-request — active objective, epic, repos, transcript). The static block is marked `cache_control: { type: 'ephemeral' }` in `claude.js`, so Anthropic caches it for 5 minutes.

**Prompt Caching Strategy (3 of 4 ephemeral slots used)**
`buildApiPayload()` in `claude.js` uses three cache layers:
1. **Static system prompt** — SOP + templates + rules. Written once per session, read on every subsequent turn (~10% of input cost).
2. **Dynamic context block** — active objective/epic/repos/transcript. Cached separately; hits on every turn where context hasn't changed (the common case in a focused session).
3. **Message history** — when conversation is ≥ 4 messages, `cache_control` is placed on the message at `length - 3`, caching all prior turns. Only the last 2 turns pay full price. Message history is also capped at 40 messages (20 turns) to bound total token cost.

**Chat Request Flow**
`POST /api/chat` receives `{ messages, active_objective, active_epic, active_repos, transcript_summary, figma_urls, pasted_images, model }`. Backend fetches Figma images in parallel (before opening SSE), then calls `claude.js → chatStream()`. Tokens stream back as `data: {"text":"..."}` SSE events, terminated by `data: [DONE]`.

**Draft Card Flow**
Claude emits `<!-- draft:story -->`, `<!-- draft:epic -->`, etc. markers in its response. `Message.jsx` splits on these markers and renders `DraftCard` components inline. Each card shows the artifact content + a "Create in Shortcut" button that POSTs to the matching `routes/artifacts.js` endpoint.

**Context Signal Flow**
Silent markers `<!-- context:objective id:NNN -->` and `<!-- context:epic id:XXXXX -->` are UI state signals, not draft cards. `Message.jsx` detects them, fires side-effect handlers passed down from `App.jsx`, and strips them from displayed text. The handlers call `useObjectiveContext.handleLoadObjective()` or `setActiveEpic()`.

---

## API Surface

| Method | Path | File | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | index.js | Liveness check |
| GET | `/api/context-status` | index.js | Cache freshness |
| POST | `/api/bootstrap` | index.js | Re-run bootstrap |
| POST | `/api/chat` | index.js | SSE streaming chat |
| POST | `/api/summarize-transcript` | index.js | Haiku transcript extraction |
| GET | `/api/objective/:id` | index.js | Full objective + epics + stories |
| GET | `/api/epic/:id` | index.js | Epic + story list |
| GET | `/api/reference-library` | index.js | Config + enriched reference names |
| POST | `/api/reference-library/add` | index.js | Add reference objective + re-bootstrap |
| POST | `/api/reference-library/remove` | index.js | Remove reference objective + re-bootstrap |
| POST | `/api/create/story` | routes/artifacts.js | Create Shortcut story |
| POST | `/api/create/epic` | routes/artifacts.js | Create Shortcut epic |
| POST | `/api/create/milestone` | routes/artifacts.js | Append milestone to objective description |
| POST | `/api/create/objective` | routes/artifacts.js | Create Shortcut objective |
| POST | `/api/update/epic` | routes/artifacts.js | Update Shortcut epic |
| GET | `/api/repos` | routes/github.js | List user's GitHub repos |
| GET | `/api/repo/:owner/:repo` | routes/github.js | Fetch repo context (README, PRs, issues) |
| GET | `/api/settings` | routes/settings.js | Read .env keys (values masked) |
| POST | `/api/settings` | routes/settings.js | Write .env keys |

---

## Validation Loop

Run these after every meaningful change:

```bash
# 1. Fetch team context from Shortcut
npm run bootstrap

# 2. Start both servers
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173

# 3. Manual checks
# - GET /api/health → { ok: true }
# - GET /api/context-status → cache exists, not stale
# - Context badge shows green with timestamp
# - Send a message in chat → streams back a response
# - Send "Draft a test story" → draft card appears with markers
# - "Create in Shortcut" on a draft → story appears in Shortcut
# - Paste an objective ID → sidebar shows name + epics + milestones
```

---

## Key Conventions

**Prompts**
All prompt strings live in `backend/src/prompts.js` — never inline them in route handlers or `claude.js`.

**Draft markers** — trigger DraftCard rendering in the frontend (defined in `lib/draftConstants.js`):
- `<!-- draft:story [epic_id:XXXXX] -->`
- `<!-- draft:epic -->`
- `<!-- draft:objective -->`
- `<!-- draft:prd -->`
- `<!-- draft:milestone -->`

**Context signal markers** — silent UI state updates, stripped from display:
- `<!-- context:objective id:NNN -->` → loads objective into sidebar
- `<!-- context:epic id:XXXXX -->` → sets active epic

**`useChatHistory` dependency note**
`messages`, `model`, and `chatFigmaLinks` stay in `App.jsx` (not inside the hook) because `buildChatContext()` in App.jsx closes over them. Moving them into the hook would create a circular dependency. The hook accepts `messages` as a parameter and uses callbacks to sync state changes back up.

**Shortcut doc IDs** (in `bootstrap.js`):
- SDLC SOP: `685c2655-b99d-428b-be72-cfab2e2d44a2`
- Story Template: `68408807-787a-463e-80cd-da0e87e1d725`
- Epic Template: `685c577e-c55c-4831-8b79-d93d0d2e9a8d`
- Objective Template: `685c648d-4009-489f-9a58-7e8a0965c2e4`

**Heritage IRA reference objective:** ID `15014`
**Backend port:** 3001 | **Frontend port:** 5173 (Vite proxies `/api/*` to backend)

---

## Environment

```
ANTHROPIC_API_KEY=...
SHORTCUT_API_TOKEN=...
GITHUB_TOKEN=...
FIGMA_API_TOKEN=...
PORT=3001
```
