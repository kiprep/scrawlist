# Scrawlist

Web app where you write and draw to Claude with Apple Pencil on an iPad, and Claude writes back.

**Status:** v0 — keyboard text input, deploy pipeline bring-up. **Next up:** [v1-dogfood.md](v1-dogfood.md) — bug-report flow that unlocks the Scrawlist → GitHub Issue → Claude Code dogfood loop.

## Architecture

- SvelteKit + `adapter-static`, deployed to GitHub Pages via Actions
- Anthropic API called directly from the browser; key lives only in `localStorage` on the user's device
- No backend, no proxy, no server

See [spec.md](spec.md) for the full brief.

## Deployed site

https://kiprep.github.io/scrawlist/

## Local dev

Requires Node 22+.

```sh
npm install
npm run dev
```
