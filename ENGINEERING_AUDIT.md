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

## Follow-up: startup and HTML-injection fixes (28 November 2026)
- **Confirmed startup blocker:** the performance pass removed the network sparkline canvas, but stale JavaScript still called `getContext('2d')` on the missing element. Removed the unused canvas initialization. The network throughput widget remains explicitly unavailable rather than fabricating telemetry.
- **HTML injection hardening:** escaped user-controlled WhatsApp preview text, uploaded document filenames, and timer labels before inserting them into HTML.
- **CI regression guard:** added a static check that every canvas initialized through `getElementById(...).getContext('2d')` exists in the page markup.
- **Validation status:** JavaScript/HTML ID validation passed on commit `af9a0fe`; the Android build for the later security-fix commit `03fa128` was still running at audit time. The newest workflow after the CI regression guard must complete before this pass is called green.
- **Remaining:** no physical Android runtime test, no exhaustive end-to-end verification of all 224 currently declared buttons, no Lighthouse run, and no production backend proxy for Gemini credentials. The Worker-based code runner is isolated from the page DOM and receives no API key, but it is not a hardened security boundary against all network-capable code.

## Network, privacy, and location diagnostics pass — 28 November 2026
- Added a separate, testable network diagnostics module. Public WAN IP lookup is opt-in through ipify, validated as IPv4/IPv6, not stored, and hidden again on user action. The app does not attempt WebRTC-based private/LAN IP discovery.
- Added an opt-in quick transfer test using Cloudflare's documented download/upload endpoints: about 1 MiB downloaded and 256 KiB uploaded. The app reports measured bytes and elapsed time as approximate Mbps; it does not persist results. Browser/API/CORS failures remain visible as failures.
- Added Network Information API readouts only as estimates (effective connection type, estimated downlink, and estimated RTT); unsupported browser fields remain NOT REPORTED.
- Removed the hardcoded Surat GPS fallback. Page load restores only a previously selected manual city; GPS is requested only after a button tap and an explicit disclosure. Denial, timeout, and unavailable GPS no longer report a false successful location.
- Fixed latitude/longitude hemisphere display (N/S and E/W), displays GPS accuracy where supplied, and keeps GPS coordinates session-only. Updated Open-Meteo reads for current temperature, humidity, wind, and weather code; removed static weather values that were not being fetched.
- Added Node built-in tests for address validation, throughput math, Network Information API estimates, IP-provider response validation, transfer measurement, and request failure. CI now runs the tests and syntax-checks the new module.
- Privacy disclosure covers the IP lookup provider, Cloudflare measurement traffic, location permissions, and third-party coordinate processing.

### Coordinated workstreams
1. Network engineering — public WAN lookup, real transfer measurement, and estimate labeling.
2. Geolocation engineering — consent, permission errors, manual-city restore, and coordinate formatting.
3. Privacy/security review — no background lookups, no LAN-IP probing, no persistent IP/speed results, provider disclosures.
4. Frontend/product — opt-in controls, honest status messages, and removal of unverified weather readouts.
5. QA/release — Node unit tests, source checks, GitHub Actions Android build, and explicit remaining device-test gates.

### Remaining release gates
- CI can validate syntax, deterministic logic, and Android APK compilation; it cannot confirm Android GPS permission behavior or the device's real network/CORS path.
- Run public IP lookup and the quick speed test on the target Android browser/device after deployment; verify mobile-data consent, slow-network timeout, offline state, IPv4, and IPv6 behavior.
- Continue to keep PR #1 in draft until physical-device testing, control-by-control audit, and production API-key proxy/security review are complete.
- Follow-up validation improvement: replaced the static Tomorrow/Sunday weather placeholders with two actual Open-Meteo daily forecast slots; forecasts show NOT REPORTED/UNAVAILABLE when the provider does not return the data.
- The wireframe globe now plots the selected latitude/longitude on the visible hemisphere instead of drawing a fixed Surat marker. Its callout is explicitly described in code as approximate and not a street map.
- **PWA offline shell:** added `network-diagnostics.js` to the service worker app-shell precache and bumped the cache version so existing installs fetch the new module before offline startup.
