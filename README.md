# Roots Product Helper

An AI-assisted product planning tool that connects Claude to Shortcut. Chat with Claude to draft objectives, epics, and stories — then create them directly in Shortcut with one click.

---

## What it does

- Chat interface powered by Claude (Opus / Sonnet / Haiku)
- Drafts objectives, epics, and stories using your team's Shortcut templates and writing style
- Creates Shortcut artifacts directly from the chat via "Create in Shortcut" buttons
- Load a meeting transcript and turn it into a structured plan
- Load GitHub repo context to inform planning
- Sidebar shows your active objective with epics and stories

---

## Prerequisites

- Node.js 18+
- A [Shortcut](https://shortcut.com) workspace
- An [Anthropic](https://console.anthropic.com) account

---

## API Keys

You need three values in a `.env` file at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
SHORTCUT_API_TOKEN=...
PORT=3001
```

**ANTHROPIC_API_KEY**
Get it from [console.anthropic.com/settings/api-keys](https://console.anthropic.com/settings/api-keys).

**SHORTCUT_API_TOKEN**
Get it from Shortcut → Settings → API Tokens → Generate Token.

**Optional: GITHUB_TOKEN**
Only needed if you want to load private GitHub repos as context. Add it to `.env` as `GITHUB_TOKEN=ghp_...`. Public repos work without it.

---

## Shortcut workspace setup (required before bootstrap)

This tool pulls four documents from your Shortcut workspace to use as context:
your SDLC process doc, and templates for stories, epics, and objectives.

**You need to create these four documents in your Shortcut workspace**, then update their IDs in `backend/src/bootstrap.js`.

Open `backend/src/bootstrap.js` and find this block near the top:

```js
const DOC_IDS = {
  sdlc_sop: '685c2655-b99d-428b-be72-cfab2e2d44a2',
  story_template: '68408807-787a-463e-80cd-da0e87e1d725',
  epic_template: '685c577e-c55c-4831-8b79-d93d0d2e9a8d',
  objective_template: '685c648d-4009-489f-9a58-7e8a0965c2e4',
};
```

Replace those UUIDs with your own Shortcut document IDs. To find a document's ID, open it in Shortcut — the UUID is in the URL.

**What to put in each document:**

| Key | What it should contain |
|-----|------------------------|
| `sdlc_sop` | Your team's engineering process — how work moves from idea to shipped |
| `story_template` | The structure and format you want stories to follow |
| `epic_template` | The structure and format you want epics to follow |
| `objective_template` | The structure and format you want objectives to follow |

These don't need to be long. Even a short template with section headings is enough for Claude to match your team's style.

**Reference objective (optional but recommended)**

`config.json` contains a reference objective ID that Claude uses as a writing style example:

```json
{
  "reference_objective_ids": [15014]
}
```

Replace `15014` with the ID of a real, well-written objective from your Shortcut workspace. This gives Claude a concrete example of how your team structures work. You can add more IDs to the array, or leave the array empty to skip this.

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/Viktorfalkner/roots-product-helper.git
cd roots-product-helper

# 2. Install dependencies
npm run install:all

# 3. Copy and fill in env
cp .env.example .env
# Edit .env with your keys

# 4. Update bootstrap.js with your Shortcut doc IDs (see above)

# 5. Fetch your Shortcut context
npm run bootstrap

# 6. Start the app
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)
Backend: [http://localhost:3001](http://localhost:3001)

---

## How bootstrap works

`npm run bootstrap` fetches your Shortcut documents and a sample of your reference objective's epics and stories, then writes them to `context/cache.json`. This file is what Claude uses to understand your team's templates and writing style.

Run bootstrap again any time your templates change, or click "Refresh context" in the app sidebar.

---

## Usage

**Active objective** — paste a Shortcut objective ID into the sidebar. Claude will load its epics and stories as context for the conversation.

**Transcript** — paste meeting notes or a transcript into the transcript panel. Claude will summarize it and use it to inform drafts.

**GitHub repos** — add a `owner/repo` slug in the sidebar to load open PRs, issues, and README context.

**Quick starters** — the chat shows suggested prompts based on what context is loaded. These adapt as you add an objective, transcript, or repos.

**Creating artifacts** — when Claude drafts a story, epic, or objective, a card appears with a "Create in Shortcut" button. One click creates it directly in your workspace.

---

## Project structure

```
roots-product-helper/
├── backend/src/
│   ├── index.js       # Express server + all routes
│   ├── claude.js      # Claude API with context injection
│   ├── shortcut.js    # Shortcut REST client
│   ├── bootstrap.js   # Fetches Shortcut docs → writes cache.json
│   ├── context.js     # Loads cache + builds system prompt
│   ├── prompts.js     # System prompt templates
│   └── github.js      # GitHub repo context fetcher
├── frontend/src/
│   ├── App.jsx        # Sidebar + layout shell
│   └── components/
│       ├── Chat.jsx        # Chat thread + input
│       ├── Message.jsx     # Parses draft markers, renders DraftCards
│       ├── DraftCard.jsx   # Draft display + "Create in Shortcut" CTA
│       └── ContextBadge.jsx
├── context/cache.json  # Gitignored — populated by bootstrap
├── config.json         # Reference objective IDs
└── .env               # API keys (gitignored)
```
