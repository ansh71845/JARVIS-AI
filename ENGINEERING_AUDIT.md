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
