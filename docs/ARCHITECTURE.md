# Architecture overview

J.A.R.V.I.S. Mark VII is a client-side web application with a Capacitor Android wrapper and a Progressive Web App service worker. The repository does not currently contain a production application backend or account database.

## Runtime layers

1. **Web interface — `www/index.html`** defines the primary application shell, panels, dialogs, and controls.
2. **Frontend logic — `www/app.js`** coordinates the interface, local workspace state, assistant interactions, voice paths, manual location, weather, and external-app handoff.
3. **Network diagnostics — `www/network-diagnostics.js`** provides opt-in public IP lookup, Network Information API estimates, and quick transfer measurements. It deliberately does not probe private/LAN IP addresses.
4. **PWA — `www/manifest.json` and `www/sw.js`** provide install metadata, versioned app-shell caching, cache cleanup, and an offline fallback. Remote AI, weather, search, and diagnostic services still require network access.
5. **Android wrapper — `capacitor.config.json` and `android-template/`** package the web experience. The Java `NativeAssistantPlugin` provides native Android app-launch, external-intent, and text-to-speech methods. Device behaviour still requires physical-device verification.
6. **Validation — `tests/` and `.github/workflows/build-android-apk.yml`** cover deterministic diagnostics logic, syntax/static checks, Capacitor sync, debug APK compilation, and artifact upload.

## Data boundaries

- Workspace items are stored in browser/app local storage. This is not an encrypted vault.
- The optional Gemini API key is supplied by the user and used client-side. A browser-held key can be inspected; a server-side proxy is required before shared production distribution.
- Public IP lookup contacts ipify only after user action and confirmation.
- The quick transfer test sends about 1 MiB down and 256 KiB up through Cloudflare after confirmation.
- A GPS fix is requested only after a user action and permission. Coordinates are sent to disclosed reverse-geocoding and weather providers.
- Manual city selection can be stored locally; a GPS fix is session-only in the current implementation.

## Design principles

- Report measured results as measurements and browser-provided values as estimates.
- Never display fabricated location, speed, battery, weather, delivery, or integration states.
- Request sensitive permissions only in response to a clear user action.
- Make provider data transfers and limitations visible.
- Keep the default branch stable until the draft engineering PR passes review and device testing.
