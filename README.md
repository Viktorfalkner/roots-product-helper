# Roots Product Helper

An AI-assisted product planning tool that connects Claude to your Shortcut workspace. Chat with Claude to draft objectives, epics, stories, and PRDs — then create them directly in Shortcut with one click.

---

## API Keys

You need four keys. Add them to a `.env` file at the project root (copy from `.env.example`):

```
ANTHROPIC_API_KEY=sk-ant-...
SHORTCUT_API_TOKEN=...
GITHUB_TOKEN=ghp_...
FIGMA_API_TOKEN=figd_...
PORT=3001
```

**ANTHROPIC_API_KEY** *(required)* — Get it from [console.anthropic.com/settings/api-keys](https://console.anthropic.com/settings/api-keys). Used for all Claude API calls (planning assistant + transcript summarization).

**SHORTCUT_API_TOKEN** *(required)* — Shortcut → Settings → API Tokens → Generate Token. Used to fetch your team's docs, objectives, and create artifacts.

**GITHUB_TOKEN** *(optional)* — A personal access token with `repo` scope. Only needed for loading private GitHub repos as context. Get it from GitHub → Settings → Developer settings → Personal access tokens. Public repos work without it.

**FIGMA_API_TOKEN** *(optional)* — Figma → Settings → Account → Personal access tokens → Create. Enables Figma frame screenshots and layer context in chat. Without it, Figma links in the sidebar and chat are ignored.

---

## Quickstart

```bash
git clone https://github.com/Viktorfalkner/roots-product-helper.git
cd roots-product-helper
npm run install:all
cp .env.example .env
# Fill in your API keys in .env
npm run bootstrap
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173).

`npm run bootstrap` fetches your team's Shortcut docs, templates, and reference objectives into a local cache. Re-run it whenever your SDLC docs or templates change (stale after 7 days, badge in the UI will warn you).

---

## Claude Code tip

Alternatively, open this repo in Claude Code and ask it to read the README and get you running — it will guide you through the setup interactively.

---

## How to use

**Active objective** — paste a Shortcut objective ID or URL into the sidebar input. Claude loads its epics, milestones, and stories as working context. All drafts will anchor to it automatically.

**Active epic** — load an epic by ID or ask Claude to set one. Story drafts automatically target it (`<!-- draft:story epic_id:XXXXX -->`).

**Meeting transcripts** — paste or upload meeting notes. Claude summarizes them using Haiku (fast + cheap) and injects the key decisions, problems, and open questions into context for subsequent turns.

**PRD** — upload or paste an existing PRD. Use "Convert to objective" to have Claude draft a Shortcut objective from it.

**Figma** — add a Figma frame URL to the sidebar. Claude fetches the frame screenshot and layer structure and uses them to inform story/ticket drafts. You can also paste Figma links directly in chat.

**GitHub repos** — select repos from the picker. Claude loads README excerpts, open PRs (up to 10), and open issues (up to 10) as engineering context to avoid duplicating in-flight work.

**Reference library** — add Shortcut objective IDs as style references. Bootstrap fetches them as examples for Claude to match when drafting new artifacts.

**Creating artifacts** — when Claude drafts a story, epic, milestone, or objective, a card appears inline with a "Create in Shortcut" button. One click creates it directly in the workspace.

**Chat history** — conversations auto-save and are named after the active objective. Favorite chats with ★ to pin them to the top. Rename by clicking the pencil icon. Restore any past session from the sidebar.

**Model selector** — switch between Opus (best quality), Sonnet (balanced), and Haiku (fast) per conversation in the chat header.
