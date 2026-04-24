# Scrawlist v1 — Canvas Primitive + Agent-Driven Tools

> This supersedes the earlier v1 brief that scoped a standalone `/bug` flow. The direction has shifted twice after discussion:
>
> 1. Marking up an image and handing it to Claude is a *first-class* interaction pattern for the app, not just the bug-reporting path. So bug-reporting stops being a dedicated route and becomes a *tool* that Claude can invoke during a conversation.
> 2. Before building any of that, the canvas primitive — a writable notepad that accepts ink — needs to exist on its own. Everything else layers onto it.

See [spec.md](spec.md) for the original kickoff brief. It is stale on platform (we pivoted from native SwiftUI to SvelteKit + GitHub Pages for an iPad-only, Mac-free dev loop) and on the "Claude chat first" ordering, but the high-level product intent (notebook + pencil + AI conversation) is unchanged.

## The architecture at a glance

Three primitives, built in order, composed via tool use:

1. **Scrawl canvas.** A drawable surface. Takes optional image input, produces annotated output. Standalone — reusable by every future feature.
2. **Conversation with images.** Extend the existing chat so a message can carry the flattened canvas as image content. Claude can then reply to what you've drawn.
3. **Agent-proposed actions with human approval.** Claude uses declared tools to *propose* actions (file an issue, save a note, export a SCAD file, …). The app renders each proposal as a UI card with **[Edit] [Approve] [Dismiss]**. The user approves; the app executes. A `tool_result` goes back to Claude so the conversation continues.

> **Claude is the scribe and chief of staff. You sign. Scrawlist walks the envelope to the mailbox.**

## Core design principle

**Pencil is an annotation layer over an artifact, not an input method.**

Handwriting-recognition-as-prompt is slower than typing and the novelty fades. The value of pencil+glass is cheap spatial deixis plus natural-language annotation in one gesture — circling, arrows, crossouts, margin notes. Vision models handle sloppy markup well.

**Every feature starts from "what artifact is on screen, and how does scribbling on it become output?" — not "how does the user write a message with a pencil?"**

## Scope, by checkpoint

Each checkpoint is a stopping point. Summarize progress and wait for Kip's go-ahead before proceeding.

### Checkpoint 1 — Scribble primitive

A writable notepad. Full-bleed canvas with a slim toolbar. Apple Pencil via `PointerEvent` (pressure, tilt). Stroke rendering via [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand). Undo (stroke-granular) and clear. Responsive to rotation / resize. Two-layer state model (image layer + ink layer) so that image import can slot in later without refactoring.

Toolbar for checkpoint 1:
- App title (compact)
- Undo
- Clear
- Chat toggle → navigates to `/chat` (the existing v0 chat, moved off `/`)
- Settings gear (for the Anthropic API key; lives in shared layout)

No image import, no camera, no send-to-AI wiring, no bug button. Those are all later.

`flatten()` helper exists (composites image + ink to a PNG blob) but isn't wired to UI yet.

Vitest + CI: unit tests for the stroke model (add/undo/clear) and `flatten()` round-trip. CI runs tests before build; failing tests block deploy.

### Checkpoint 2 — Image import + send canvas to Claude

Toolbar grows:
- "Import image" button → file picker (`<input type="file" accept="image/*">`, opens iPadOS Photo Library).
- "Send to AI" button → flattens the canvas and sends it as an image content block on a new message turn.
- AI output window — a collapsed panel below or beside the canvas that expands on tap.

Conversation history persists across turns within a session (not across reloads).

### Checkpoint 3 — `file_github_issue` as an agent-proposed action

Declare a `file_github_issue` tool on the Claude call. When Claude emits a `tool_use` block, the app renders an **approve card** inline:

> Claude wants to file this issue:
> **Title:** `<proposed title>`
> **Body:** `<proposed markdown>` (image inline)
> **[Edit] [File] [Dismiss]**

Composer is paused until the card is resolved (Claude API requires a `tool_result` before the conversation can continue past a `tool_use`).

On **[File]**: app POSTs to GitHub REST API using a PAT from `localStorage` under `scrawlist.github_pat` (first-use modal mirrors the Anthropic key flow). Issue number + URL return as the `tool_result`.

On **[Dismiss]**: `tool_result` says "user dismissed" so Claude can adapt.

### Checkpoint 4 — CI green on the full loop

Tests:
- Unit: stroke model, flatten, tool-call round-trip parsing.
- Integration: end-to-end "paste image → draw → tool_use → file issue to a test repo → assert issue body contains the image" using a disposable PAT.
- Manual iPad checklist: Pencil pressure felt; screenshot-pick from Photos works; approve-card renders correctly when Claude proposes; issue lands on github.com.

CI runs unit + integration on every push. Deploy only on green.

## Out of scope for v1, even long-term

- Chat that auto-files bugs without user approval. Every Claude-proposed action flows through the approve-card.
- Handwriting-as-prompt / OCR on ink. Vision + ink-as-annotation is the model.
- Service worker, PWA install, `share_target`. Later, once the base loop is tight. Photo-library file picker is the capture path.
- `getDisplayMedia()` for screen capture. Not supported on iPadOS Safari.

## The Claude Code side of the loop

**Pull mode only.** You open Claude Code in a session and ask it to look at issue #N. Claude Code runs `gh issue view N`. Tokens burn only on your initiated sessions.

**Do not wire up `claude-code-action`, GitHub webhooks, or any automatic trigger.** Reasons:
- The repo is public. `@claude`-mention auto-triggers on public repos let bad actors spam issues to burn Anthropic tokens paid for by the repo owner's API key.
- Pull mode is sufficient for the dogfood loop. Nothing about this feature needs auto-triggering.

If auto-triggering becomes desirable much later, it must gate on `github.event.issue.author_association ∈ {OWNER, MEMBER, COLLABORATOR}` and run against an Anthropic key with its own spend cap in the Anthropic console. That's a v2+ conversation — do not preempt it.

## Working style reminders

- Surface ambiguity rather than infer silently.
- Halt-and-report rather than improvise on errors.
- Coaching approach on anything involving deploy, secrets, or signing.
- Small, scoped commits with meaningful messages.
- Run tests locally before committing, and verify CI is green before declaring a checkpoint done.
