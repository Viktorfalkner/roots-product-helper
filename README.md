# Roots Product Helper

An AI-assisted product planning tool that connects Claude to our Shortcut workspace. Chat with Claude to draft objectives, epics, and stories — then create them directly in Shortcut with one click.

---

## API Keys

You need two keys. Add them to a `.env` file at the project root (copy from `.env.example`):

```
ANTHROPIC_API_KEY=sk-ant-...
SHORTCUT_API_TOKEN=...
PORT=3001
```

**ANTHROPIC_API_KEY** — Get it from [console.anthropic.com/settings/api-keys](https://console.anthropic.com/settings/api-keys).

**SHORTCUT_API_TOKEN** — Get it from Shortcut → Settings → API Tokens → Generate Token.

**GITHUB_TOKEN** (optional) — Only needed for loading private GitHub repos as context. Add as `GITHUB_TOKEN=ghp_...`. Public repos work without it.

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

---

## Claude Code tip

Alternatively, open this repo in Claude Code and ask it to read the README and get you running — it will guide you through the setup interactively.

---

## How to use

**Active objective** — paste a Shortcut objective ID into the sidebar. Claude loads its epics and stories as context for the conversation.

**Transcript** — paste meeting notes into the transcript panel. Claude summarizes it and uses it to inform drafts.

**GitHub repos** — add an `owner/repo` slug in the sidebar to load open PRs, issues, and README context.

**Quick starters** — suggested prompts adapt based on what context you've loaded.

**Creating artifacts** — when Claude drafts a story, epic, or objective, a "Create in Shortcut" button appears. One click creates it directly in the workspace.
