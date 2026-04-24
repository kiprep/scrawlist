# Scrawlist — Project Kickoff Brief

## What we're building

**Scrawlist** is an iPad app where the user writes to Claude with Apple Pencil in a notebook-style interface. This document describes the v0 setup we need to stand up before Pencil integration is added. v0 uses a keyboard text field as a placeholder for Pencil input — the point of v0 is to prove the full deployment pipeline works end-to-end (Mac builds → TestFlight → iPad install → talks to Claude), not to build the real UX.

## v0 scope (what we're building in this session)

A single-screen iOS app with:
- A scrolling conversation view (user messages and Claude responses, latest at bottom).
- A `TextField` at the bottom for typed input.
- A "Send" button next to the text field.
- On send: append user message to history, call Claude Sonnet via the Anthropic API, append response.
- API key storage: iOS Keychain, with a first-launch prompt if no key is stored.
- Conversation history maintained in memory for the session.
- No persistence across launches in v0.
- No sidebar yet.
- No Apple Pencil / PencilKit yet.

That's it. Resist scope creep. The goal is: app on iPad, talks to Claude, via TestFlight, driven by remote builds from this Mac.

## Target platform

- iOS 17+ (iPad only is fine, but universal is okay too — the user's device is an iPad).
- Swift + SwiftUI. No UIKit unless unavoidable.
- Xcode project lives in this directory.

## Dependencies

Add one Swift Package dependency via Xcode's Package Manager:
- `https://github.com/jamesrochabrun/SwiftAnthropic` — community-maintained Anthropic API client for Swift. Supports streaming, tool use, and modern API features.

Alternative if SwiftAnthropic has issues: drop down to raw `URLSession` calls against `api.anthropic.com/v1/messages`. The API is well-documented JSON-over-HTTPS. Don't get stuck on the SDK.

## Architecture

Keep it small. Roughly:
- `ScrawlistApp.swift` — app entry point.
- `ContentView.swift` — the one screen. `ScrollView` of messages + `TextField` + Send button.
- `ChatViewModel.swift` — `@Observable` (or `ObservableObject`) holding message history, loading state, and the send method.
- `ClaudeService.swift` — wraps SwiftAnthropic. Takes a message history, returns Claude's response. Streaming is nice but not required for v0 — a simple "wait for full response" call is fine.
- `KeychainHelper.swift` — minimal wrapper around the Keychain Services API for storing and reading the Anthropic API key. Keyed on something like `com.<username>.inkwell.anthropic-api-key`.
- `Message.swift` — struct with role (user/assistant), content (String), and a UUID for SwiftUI identity.

Don't over-architect. No Clean Architecture, no separate modules, no dependency injection framework. Everything in the main target.

## Claude API details

- Model: `claude-sonnet-4-5` or the current Sonnet model string. Check SwiftAnthropic's supported model list; if unsure, fall back to whatever Sonnet identifier works.
- Max tokens: 1024 for v0. More than enough for conversational responses.
- System prompt for v0: *"You are having a conversation in a shared notebook. Keep responses concise — 1-3 sentences where possible. This is a casual, flowing conversation, not a formal Q&A."*
- Include the full conversation history in each request.
- API key is passed to SwiftAnthropic at service construction time.

## Keychain behavior

- On app launch, check Keychain for the API key.
- If present, proceed normally.
- If absent, show a simple sheet or alert: "Paste your Anthropic API key" with a text field and a Save button. Store it in Keychain.
- Add a settings gear icon somewhere that lets the user replace the key if they want.
- Do not hardcode the API key anywhere. Do not commit any file containing the API key.

## Deployment pipeline (already set up)

The Mac is already configured with:
- Apple Developer account active, signing configured in Xcode.
- App Store Connect app record created with a matching bundle ID.
- App Store Connect API key (the `.p8` file) in `fastlane/` directory.
- Fastlane installed, with a `beta` lane that archives, uploads to TestFlight, and increments the build number.
- Internal TestFlight testing group with the user added.

**You do not need to set up the pipeline — it already exists.** Your job is to write the app code and, when ready to test, run `fastlane beta` to push a build.

If `fastlane beta` is not set up or not working, stop and report — do not try to reconstruct the pipeline, because the user has the context on what's already configured.

## Git hygiene

- `.gitignore` should already exclude the Fastlane `.p8` file and any `.env` files. Verify this before your first commit.
- Commit logical chunks. Don't make one giant "initial commit" with the whole app.
- Meaningful commit messages. The user may refer back to these.

## Checkpoints

Stop and check in with the user at these points:

1. **After Xcode project is created** and opens cleanly — before adding any real code. Verify the project builds empty.
2. **After SwiftAnthropic is added** and you have a successful "hello Claude" test call working from the simulator. This proves the API wiring before any UI work.
3. **After the basic UI is wired up** and a full user-sends-message → Claude-responds cycle works in the simulator.
4. **Before the first `fastlane beta` run.** Make sure the user is ready to watch for the TestFlight notification on the iPad.

At each checkpoint, summarize what you did, what's left, and ask for approval to proceed.

## Things to explicitly NOT do in v0

- Do not add PencilKit. That's v1, after deployment is proven.
- Do not add the sidebar / split view. That's also v1.
- Do not add streaming response rendering. Full-response wait is fine for v0.
- Do not add conversation persistence (UserDefaults, Core Data, SwiftData, files). In-memory is fine.
- Do not add fancy UI polish, animations, haptics, sounds, themes, dark mode tuning. Default SwiftUI styling is fine.
- Do not add tool use, MCP, or any Claude features beyond basic messages. Even though the final app will use tool use for the sidebar, v0 doesn't need it.
- Do not add analytics, crash reporting, or any third-party SDKs beyond SwiftAnthropic.
- Do not add authentication beyond the Keychain API key prompt. No sign-in, no accounts.
- Do not generate app icons, launch screens, or marketing assets. Defaults are fine.
- Do not set up CI in GitHub Actions. The user may add this later; don't preempt it.

## Failure modes to watch for

- **Signing errors on archive.** If `fastlane beta` fails with signing errors, stop and report the full error. Do not try to fix signing by poking at certs or profiles — the user has the pipeline set up and will want to debug signing issues interactively.
- **API key rejected.** If Claude API calls return 401, the API key is wrong or missing. Report clearly.
- **TestFlight upload succeeds but build doesn't appear.** Usually export compliance — the user answered this once in App Store Connect but a new app record may need it again. Report and ask.
- **SwiftAnthropic doesn't support the current model string.** Fall back to raw `URLSession`. Don't spend more than ~20 minutes fighting the SDK.

## Tone and working style

The user prefers:
- You surface ambiguity rather than infer silently. When in doubt, ask.
- Halt-and-report rather than improvise on errors.
- Coaching approach — walk through operations rather than executing silently, especially for Xcode/signing/deployment steps.
- Transferable patterns (standard SwiftUI, standard Swift packages) over bespoke solutions.

The user has a QA/test automation background and will be testing this on a real iPad over cellular/hotel-wifi while traveling. Things should actually work, not just compile.

## First action

Before writing any code, confirm you can see this file and the existing project directory state. List what's already in the project directory and report. Then wait for the user to confirm before starting.
