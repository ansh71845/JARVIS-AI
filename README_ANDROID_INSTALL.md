# J.A.R.V.I.S. Mark VII — Android installation and build guide

This guide covers the current Capacitor Android workflow. The generated APK is a **debug build for testing**, not a Play Store release.

## Option A — Download the GitHub Actions APK

1. Open the [J.A.R.V.I.S. Android APK workflow](https://github.com/ansh71845/JARVIS-AI/actions/workflows/build-android-apk.yml).
2. Select the latest run for the branch you intend to test. For the current hardening work, use `audit/jarvis-mark-vii-hardening` while [PR #1](https://github.com/ansh71845/JARVIS-AI/pull/1) remains in draft.
3. Confirm the run completed successfully. Do not use an artifact from a failed, cancelled, or older run.
4. Open the run's **Artifacts** section and download `JARVIS-Mark-VII-Android-APK`.
5. Extract the ZIP and locate `app-debug.apk`.
6. Transfer the APK to the Android device and install it. Android may ask you to allow installation from the app used to open the APK. Grant that permission only to the trusted app you used for this install, then revoke it when finished if it is no longer needed.

The most recently verified build when this guide was written is [workflow run #46158797729](https://github.com/ansh71845/JARVIS-AI/actions/runs/46158797729). Check the Actions page for newer runs before installing.

## Option B — Build locally

### Requirements

- Node.js 20 or newer
- JDK 17
- Android SDK with the platform/build tools required by the Capacitor Android project
- Android Studio is optional for command-line compilation, but useful for inspecting and debugging the native project

### Commands

Run from the repository root:

```bash
npm install
npx cap add android
cp android-template/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
mkdir -p android/app/src/main/java/com/stark/jarvis/os
cp android-template/src/main/java/com/stark/jarvis/os/NativeAssistantPlugin.java android/app/src/main/java/com/stark/jarvis/os/
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. On Windows, use PowerShell's `Copy-Item` and create the destination directory before copying the manifest and Java source.

## Option C — Use the web/PWA preview

[Open the current audit preview](https://jarvis-ai-git-audit-jarvis-mark-vii-hardening-ansh-0328.vercel.app)

For local development, serve the `www/` directory over localhost or HTTPS. Browser permissions such as microphone and geolocation depend on the browser and secure-context requirements. Some native Android actions are available only inside the Capacitor APK.

## First-run checks

- Test voice input and speech output separately. Browser speech recognition support differs by device.
- Test app launch with an installed app and with an app that is not installed.
- Test GPS only after choosing **Request GPS** and reviewing the location disclosure.
- Use the network panel's public IP and speed-test controls only after reviewing the provider/data-transfer confirmation. The speed test uses mobile data if mobile data is active.
- Verify that manual city search, current weather, and daily forecasts show an unavailable state when their providers cannot be reached.
- Test offline launch and online update after the PWA service worker has been installed.

## Privacy and security notes

- The app's browser workspace is not encrypted by J.A.R.V.I.S.
- Gemini keys entered in the client are recoverable by someone who can inspect the page. Do not embed a shared production key.
- GPS coordinates are sent to disclosed geocoding and weather providers after a user-approved GPS request.
- Public IP lookup contacts ipify. The quick speed test sends download and upload traffic to Cloudflare.
- The debug APK is for testing. Do not treat it as a signed production release.

Read the [Privacy Policy](www/privacy.html), [Terms](www/terms.html), and [Security Notes](SECURITY.md) before distributing builds.
