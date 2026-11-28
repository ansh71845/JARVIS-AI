# Validation and release status

This page separates automated checks from behaviour that requires a real device.

## Automated CI coverage

The Android workflow currently runs:

- JavaScript syntax checks for `www/app.js` and `www/network-diagnostics.js`.
- Six Node built-in tests for IP validation, throughput calculations, browser network estimates, provider-response validation, transfer measurement, and failure handling.
- Static HTML ID duplicate detection and a check that canvas initializers reference existing canvas elements.
- Capacitor Android project creation and sync.
- Android debug APK compilation and artifact upload.

The latest previously verified run is [#46158797729](https://github.com/ansh71845/JARVIS-AI/actions/runs/46158797729), which completed successfully for the code state at its recorded commit. Documentation changes create new workflow runs; consult the Actions page for the newest head commit.

## Not covered by CI

A green cloud build does not prove:

- GPS permission grant, denial, timeout, and accuracy on a physical phone.
- Native app launching and dialer handoff on the target Android version.
- Voice recognition, text-to-speech quality, and app lifecycle behaviour on a real device.
- Public IP lookup or Cloudflare transfer requests on the target browser/network.
- PWA install, offline first launch, service-worker update, and recovery after connectivity returns.
- Accessibility and correct behaviour of every legacy control.

## Release rule

Keep the current hardening PR in draft until the device checks, full control audit, and production security review are complete. A debug APK is a test artifact, not a production-signed Android release.
