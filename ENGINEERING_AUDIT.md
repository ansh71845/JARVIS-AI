# J.A.R.V.I.S. Mark VII — Engineering Audit

**Audit branch:** `audit/jarvis-mark-vii-hardening`  
**Baseline:** `main` at `c32302d97ba913831e646afa5a633323582c266b`  
**Scope:** Repository structure, Capacitor configuration, Android bridge, PWA service worker, and initial frontend source review.

## Confirmed repository facts
- The web application is concentrated in `www/index.html`; the PWA has `www/manifest.json` and `www/sw.js`.
- Android native source is held in `android-template/`; the GitHub Actions workflow generates/syncs a Capacitor Android project.
- The latest observed APK workflow run on the baseline commit completed successfully. This verifies build automation only, not on-device behavior.
- The native plugin exposes app launching and text-to-speech. Its `speak` method resolves when speech is queued, not when playback has completed.

## Confirmed risks / defects to address
1. **Debug and transport hardening:** baseline Capacitor config enables WebView debugging and mixed HTTP content. These should be disabled for release builds; all remote resources should use HTTPS.
2. **PWA cache lifecycle:** baseline service worker never deletes obsolete caches and can reject fetches when both network and cache miss. This branch replaces it with versioned cache cleanup, same-origin caching, and an explicit offline response.
3. **Capability honesty:** the PWA install fallback downloads a standalone HTML file; it is not an app installation. UI copy should distinguish export from installation.
4. **Native speech queue:** pending speech is replayed with `QUEUE_FLUSH`, so a multi-item queue may discard earlier items. The plugin also lacks lifecycle cleanup for TextToSpeech. Requires a focused native patch and device tests.
5. **Android permissions:** baseline manifest requests microphone, camera, and precise/coarse location. Each permission must be justified by a user-facing feature and requested at runtime only when needed.
6. **Code execution surface:** the UI advertises a JavaScript sandbox. Verify isolation, execution limits, and whether it is a genuine isolated worker/iframe before enabling untrusted input. Never use page-context `eval` for untrusted code.
7. **Large single-file frontend:** a single large HTML file increases regression risk. Avoid broad rewrites until handlers and dependencies are inventoried.

## Work completed on this branch
- Replaced the PWA service worker with cache-version cleanup, same-origin-only runtime caching, safe offline fallback, and cache population for successful basic responses.

## Required validation before release
- Run syntax checks and a clean Android CI build.
- Test offline first load, offline navigation, online update, and service-worker upgrade.
- Test Android app launch for installed and missing packages, speech queue ordering, stop speech, background/foreground transitions, and permission denial.
- Audit every interactive element against a real action; label unsupported actions honestly.
- Scan frontend and repository history for embedded API keys and secrets.
- Verify Gemini requests, rate/error handling, and user-visible failure states without exposing credentials.

## Not yet verified
No claim is made that all controls, Gemini flows, native permissions, or phone-specific behaviors have passed runtime tests. Those require full handler inspection and physical/emulated device validation.


## Follow-up changes committed
- **Gemini model:** replaced the retired `gemini-1.5-flash` endpoint with `gemini-3.8-flash`; API keys are sent in the `x-goog-api-key` header instead of the URL; added a 20-second timeout and visible API/network errors. When the user has configured Gemini, failures no longer silently switch to an unrelated provider.
- **Native speech:** fixed pending TextToSpeech queue playback so subsequent queued utterances use `QUEUE_ADD` rather than repeatedly flushing the queue.
- **Phone dialer:** removed the fabricated "connected" call transcript/timer. The action now validates the number and hands off to Android's real `tel:` dialer. Ending the JARVIS panel no longer claims to hang up a real call.
- **Biometric UI:** removed the fake PIN form and relabeled the scanner as a visual demo; it does not authenticate identity.
- **JavaScript sandbox:** moved execution into a disposable Web Worker, passed only a minimal city context, removed direct access to app functions/state, and added a two-second termination limit. This is an execution-isolation improvement, not a promise that arbitrary code is safe to run.
- **Capacitor defaults:** disabled mixed-content loading and WebView debugging in the real config and the embedded project-template copy.
- **CI:** added inline JavaScript syntax and duplicate static-ID checks before the Android build. One audit-branch build completed successfully, including those checks and APK artifact upload.

## Remaining high-priority work
- Audit the full 243-button surface and classify controls as real, local simulation, or unsupported. Some existing features (e.g. smart-home controls and visual lock) are local simulations and must not be marketed as physical-device integrations or security.
- Review the Web Dev preview iframe and template interpolation for injection risks.
- Add a secure backend/proxy if this will be distributed beyond personal use; client-side API keys are recoverable by anyone who can inspect the app.
- Complete Android device tests for the dialer handoff, TTS queue, permission prompts, lifecycle, and Web Worker support.
- Validate the newest commit's CI run before opening a PR. Do not merge this branch into `main` until the final CI run and review pass.

- **Website preview:** added an opaque-origin iframe sandbox (`sandbox="allow-scripts"`) and escaped prompt text before inserting it into generated HTML.
- **Smart-home panel:** relabeled the local state-only controls as a simulator rather than implying connected physical devices.
- **Android transport:** disabled cleartext HTTP traffic in the native manifest and its embedded template copy.
