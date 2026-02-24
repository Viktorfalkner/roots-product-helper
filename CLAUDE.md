# Roots Product Helper — Project CLAUDE.md

## Stack

- **Backend:** Node.js / Express (ESM, `"type": "module"`)
- **Frontend:** React 18 + Vite
- **AI:** Claude API via `@anthropic-ai/sdk` (claude-opus-4-6)
- **Project management:** Shortcut REST API v3

## Architecture

```
roots-product-helper/
├── backend/src/
│   ├── index.js       # Express server + all routes
│   ├── claude.js      # Claude API with context injection
│   ├── shortcut.js    # Shortcut REST client
│   ├── bootstrap.js   # Fetches Shortcut docs → writes cache.json
│   └── context.js     # Loads cache + builds system prompt
├── frontend/src/
│   ├── App.jsx        # Sidebar + layout shell
│   └── components/
│       ├── Chat.jsx        # Main chat thread + input
│       ├── Message.jsx     # Parses draft markers, renders DraftCards
│       ├── DraftCard.jsx   # Renders draft + "Create in Shortcut" CTA
│       └── ContextBadge.jsx
├── context/cache.json  # Gitignored — populated by bootstrap
├── config.json         # Reference objective IDs
└── .env               # ANTHROPIC_API_KEY, SHORTCUT_API_TOKEN, PORT
```

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
# - Context badge shows green with timestamp
# - Send "Draft a test story" → response uses story template structure
# - Paste objective ID → sidebar shows name + milestones
# - "Create in Shortcut" button on a draft → story appears in Shortcut
```

## Key Conventions

- Draft markers: `<!-- draft:story -->`, `<!-- draft:epic -->`, `<!-- draft:objective -->`
  - These trigger DraftCard rendering in the frontend
- Shortcut doc IDs (in bootstrap.js):
  - SDLC SOP: `685c2655-b99d-428b-be72-cfab2e2d44a2`
  - Story Template: `68408807-787a-463e-80cd-da0e87e1d725`
  - Epic Template: `685c577e-c55c-4831-8b79-d93d0d2e9a8d`
  - Objective Template: `685c648d-4009-489f-9a58-7e8a0965c2e4`
- Heritage IRA reference objective: ID `15014`
- Backend port: 3001 | Frontend port: 5173 (proxied to backend via Vite)

## Environment

```
ANTHROPIC_API_KEY=...
SHORTCUT_API_TOKEN=...
PORT=3001
```
