# Scrawlist Native — Kickoff Brief for a New Agent

> You are a fresh Claude Code session with no prior context on this project. Everything you need to start is in this document. Do not port the web prototype code; read it only for UX direction.

## What we're building

Scrawlist is an iPad app where the user writes and draws to Claude with Apple Pencil in a notebook-style interface. The first-class interaction is **image + ink + send to Claude**: import or paste a screenshot, scrawl annotations, hit send, Claude reads the handwriting and markup and writes back in the same notebook.

This document specifies **v0 native**: a single-screen iOS app that proves the full Mac → TestFlight → iPad pipeline and proves the Claude multimodal call works. No tool use, no GitHub integration, no bug-filing. Those land in v1+.

## Context — why native now

A web prototype exists at **https://kiprep.github.io/scrawlist/** (source: **https://github.com/kiprep/scrawlist**). It was built because the developer's Apple Developer account had expired and iPad-only development was the only remaining option. The account was reactivated late on 2026-04-23; native iOS is back on the table.

The web version works end-to-end today: Apple Pencil via Pointer Events, `perfect-freehand` ink rendering, canvas flatten to PNG, direct browser POST to Anthropic's Messages API, conversation history in memory, response rendered in a collapsible panel.

**What the web version validated that carries over:**
- Pencil is an annotation layer, not an input method.
- A canvas primitive (image in → annotated image out) composes cleanly.
- The "Send to Claude" UX with a paper-plane button and a collapsible output panel feels right.
- The settings + API-key modal pattern is fine as a first-launch flow.
- The planned v1 direction is **agent-proposed actions with human-in-the-loop approval** (Claude uses tools like `file_github_issue`, app renders an approve card, user signs off, app executes). v0 has none of this, but design for its eventual arrival.

**What doesn't carry over:**
- Any of the SvelteKit / TypeScript / browser APIs. PencilKit, Keychain, URLSession, and SwiftUI make the web architecture obsolete.
- The `anthropic-dangerous-direct-browser-access` header — native apps do NOT send it.
- `localStorage` for the API key — use Keychain.

## Architectural principles

Carry these forward from the web version:

1. **Pencil is an annotation layer over an artifact, not an input method.** Handwriting-recognition-as-prompt is slower than typing and the novelty fades. The value is cheap spatial deixis plus natural-language annotation — circling, arrows, crossouts, margin notes over an image. Vision models handle sloppy markup well.
2. **Every feature starts from: what artifact is on screen, and how does scribbling on it become output?** Not: how does the user write a message with a pencil?
3. **Canvas is a reusable primitive.** Don't couple it to Claude or any specific output destination. It takes an image (optional) and ink strokes, produces an annotated image.
4. **Agent proposes, user approves.** Eventually Claude will propose actions via tool use. The app will render each proposal as an approve card with **[Edit] [Approve] [Dismiss]**. Design with this in mind; don't build silent-auto-execute paths.

## v0 scope — build this

A single-screen SwiftUI app:

- **Canvas.** A `PKCanvasView` (PencilKit) covering the safe area below a top toolbar. Start with an empty canvas — image import comes in a later checkpoint. PencilKit handles pressure, tilt, palm rejection, and undo for you. Trust it.
- **Toolbar.** Five controls, left to right: Undo, Clear, Send (paper-plane, accent color), Settings gear.
  - Undo: `canvasView.undoManager?.undo()`.
  - Clear: empties the drawing.
  - Send: flattens the canvas to a PNG, POSTs to Claude as an image content block alongside the running history, renders the text reply in the output panel. Disabled when nothing has been drawn or while a request is in flight.
  - Settings: opens a sheet with the masked API key (last 4 chars visible) and a "Replace Key" button.
- **Output panel.** A collapsible view pinned below the canvas. Hidden until the first send. Peek mode shows a 1–2 line preview; tap to expand to full text. Shows "Claude is thinking…" during the in-flight request.
- **First-launch key prompt.** If Keychain has no key, show a sheet on launch with a text field (secure entry), a "Get a key at console.anthropic.com" link, and a Save button. No way to dismiss without saving a key.

Conversation history is in-memory for the session. No Core Data, no UserDefaults, no SwiftData for message persistence in v0.

## Tech stack

- **iOS 17+** (or 18+ if Xcode ships newer). iPad-only is fine; universal is okay if it comes for free.
- **Swift + SwiftUI.** No UIKit unless unavoidable (PencilKit needs a `UIViewRepresentable` wrapper — that's fine, keep it tiny).
- **PencilKit** for ink. Don't roll a custom drawing implementation.
- **URLSession** for the Anthropic call. Or `SwiftAnthropic` (https://github.com/jamesrochabrun/SwiftAnthropic) if it currently supports multimodal messages cleanly. If SwiftAnthropic is awkward or lagging, fall back to raw URLSession and JSONEncoder/Decoder. Don't spend more than ~30 minutes fighting the SDK.
- **Keychain Services** (Security framework, `SecItemAdd` etc.) for the API key. A small `KeychainHelper.swift` wrapper is sufficient. Do not use `UserDefaults`.
- **Xcode 15+ / 16.**

Don't add a dependency manager for v0 unless you need it. If you add SwiftAnthropic, do it through Xcode's built-in Swift Package Manager UI.

## Deployment pipeline

The developer has:
- An active Apple Developer account (renewed 2026-04-23).
- A Mac with Xcode. The web dev loop was working on this Mac; Node 22 is installed at `/opt/homebrew/opt/node@22/bin`.
- No pre-existing App Store Connect app record, no Fastlane config, no signing configured for this project. You'll set those up.

**Before writing code:**
1. List the working directory. Confirm no Xcode project exists yet.
2. Run `xcode-select -p` and check for Xcode.
3. Confirm with the user:
   - Preferred bundle ID (default suggestion: `com.kiprep.scrawlist`).
   - Whether to go iPad-only or universal.
   - Whether to set up Fastlane in v0 or stay simulator-only until the core app works.
4. Wait for answers before creating the Xcode project.

**Deployment order (when the user greenlights it):**
1. Create the Xcode project and verify it builds clean on the simulator.
2. Create the App Store Connect app record with the matching bundle ID.
3. Configure automatic signing with the developer's team.
4. Install Fastlane if the user wants it: `beta` lane that archives, uploads to TestFlight, increments build number.
5. Add the developer to an internal TestFlight group.

**Important**: The user is flying tomorrow. A brand-new TestFlight app record can take up to 24h for the first build to clear Apple's processing and initial export-compliance review. Do not promise an installed build on their iPad before the flight. The realistic travel goal is "simulator works + TestFlight upload queued."

## API key handling

- On launch, query Keychain for `com.<bundle-id>.anthropic-api-key` (use `kSecAttrAccessibleAfterFirstUnlock`).
- If absent, present the first-launch sheet. It cannot be dismissed without saving a key.
- Settings gear opens a sheet showing `sk-ant-…xxxx` (last 4 chars) and a "Replace Key" button that re-opens the entry sheet.
- Every API call reads the key from Keychain at call time. Don't cache it in a singleton that could stick around.
- The key NEVER touches the repo. No `.plist`, no `.xcconfig` checked in, no `@State` default string. If you catch yourself typing `ANTHROPIC_API_KEY = "sk-ant-..."` anywhere, stop.

## Claude API details

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Headers:**
  - `x-api-key: <key>`
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`
  - Do NOT send `anthropic-dangerous-direct-browser-access` — that's browser-only.
- **Model:** `claude-sonnet-4-6` (the current Sonnet as of 2026-04-24). If that returns a 400 "invalid model", check the Anthropic docs for the current Sonnet identifier and update.
- **max_tokens:** 1024 for v0.
- **system prompt:** *"You are having a conversation in a shared notebook. Keep responses concise — 1-3 sentences where possible. This is a casual, flowing conversation, not a formal Q&A."*
- **messages:** full conversation history. User messages carrying an image use a content-blocks array:
  ```json
  {
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": {
          "type": "base64",
          "media_type": "image/png",
          "data": "<base64-encoded PNG, no data: prefix>"
        }
      }
    ]
  }
  ```
  Assistant messages store the plain text reply as `content: "..."`.
- **Flatten the canvas**: PencilKit's `PKCanvasView.drawing.image(from:scale:)` gives you a `UIImage` of the current ink. Composite over white if the canvas is transparent. Convert to PNG with `pngData()`. Base64 with `.base64EncodedString()`.
- No streaming in v0.

## Checkpoints — stop and report

At each checkpoint, summarize what works and wait for the user's go-ahead.

1. **Xcode project builds blank.** Fresh SwiftUI app opens and runs in the simulator.
2. **Canvas draws in the simulator.** `PKCanvasView` is wired up, you can scribble with the cursor, undo and clear work.
3. **Keychain round-trip works.** First-launch sheet saves the key; reload the app in the simulator; the key survives and the sheet doesn't re-appear.
4. **First Claude call succeeds.** Draw a thing, tap Send, see a text reply render in the output panel. This is the "it works" moment.
5. **Settings sheet works.** Gear opens, masked key shown, Replace Key flow clean.
6. **Before the first `fastlane beta` or Xcode Organizer upload** — warn the user, walk them through export compliance, let them watch for the TestFlight notification.

## Not in scope for v0

- Tool use or `file_github_issue` action. That's v1.
- GitHub integration or PAT storage.
- Image import (Photos picker) or share extension. Add after the core send loop works.
- Streaming responses.
- Conversation persistence across app launches.
- Multiple canvases, layers, or pages.
- Handwriting-recognition-as-prompt (OCR). Vision + ink-as-annotation is the model.
- Dark mode tuning, custom app icon, launch screen polish. Xcode defaults are fine.
- Analytics, crash reporting, third-party SDKs beyond PencilKit and optionally SwiftAnthropic.

## Failure modes to watch for

- **Signing errors on archive.** `fastlane beta` or Xcode's Organizer fails with signing noise. STOP. Don't fiddle with certs/profiles. Report the full error to the user and ask — they have the Apple Dev console and can fix it in UI faster than you can via CLI.
- **API key rejected (401).** Clearly report "API key rejected" — don't silently retry or swallow. Reopen the key sheet.
- **TestFlight upload succeeds but the build doesn't appear in the console for internal testers.** Almost always export compliance — answer the encryption questions in App Store Connect. Report and ask.
- **PencilKit palm-rejection quirks.** If the user reports strokes dropping or wrong-hand touches, DO NOT layer your own `UITouch` handlers as a workaround. PencilKit handles this better than anything you can roll. First check `PKCanvasView.drawingPolicy` and `allowsFingerDrawing`.
- **SwiftAnthropic doesn't support multimodal or the latest Sonnet.** Fall back to raw URLSession. The API is well-documented JSON.

## Working style

The developer is Kip Repscher:
- Senior QA / test-automation background.
- Python is primary; Swift is new-to-them as of this project. Frame Swift explanations with Python parallels where it helps the mental bridge. Call out differences (value vs. reference types, actor isolation, async/await vs. asyncio) explicitly.
- Prefers compact info with concrete examples over walls of text.
- Prefers halt-and-report over improvise-on-error, especially for anything involving signing, secrets, or deployment.
- Prefers small scoped commits with meaningful messages. The user reads them later.
- Prefers coaching through interactive operations (Xcode GUI steps, App Store Connect forms) rather than silent automation.
- Traveling starting 2026-04-24. Iteration time matters. Don't sit on long-running builds or uncommitted work.

## First action

1. List the contents of the working directory (`ls -la`).
2. Confirm you can see this file.
3. Run `xcode-select -p`. Report what's installed.
4. Ask the user the three questions above (bundle ID, iPad-only vs universal, Fastlane now or later).
5. Wait for answers before creating the Xcode project.

## References

- **Web version live:** https://kiprep.github.io/scrawlist/ — open this on the Mac or iPad to feel the UX direction. Try: enter an API key, draw something, tap the paper-plane Send button, read Claude's reply in the bottom panel, tap the panel to expand.
- **Web version source:** https://github.com/kiprep/scrawlist
- **Files worth reading for design intent (but DO NOT PORT):**
  - `src/routes/+page.svelte` — the notepad screen composition
  - `src/lib/Canvas.svelte` — how ink capture and flatten are wired
  - `src/lib/Output.svelte` — the collapsible response panel shape
  - `src/lib/claude.ts` — the exact Anthropic request shape (copy the headers/body structure, translate to Swift)
  - `spec.md` — the original pre-pivot spec (contains the same pipeline guidance, now reactivated)
  - `v1-dogfood.md` — the planned v1 direction (tool use + approve cards + GitHub integration). Not v0, but read it so you don't build toward a design that blocks it.

Good luck. Keep it small, ship to the simulator first, talk to the user before touching anything that publishes.
