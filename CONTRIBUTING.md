# Contributing

Thanks for considering a contribution to J.A.R.V.I.S. Mark VII.

## Before opening a pull request

1. Explain the user problem and the behaviour change.
2. Keep changes focused. Avoid broad rewrites of the single-file frontend unless required.
3. Do not add fake telemetry, sample transactions, fabricated reviews, mock delivery confirmations, or buttons that imply an integration where none exists.
4. Do not claim a feature is secure, private, offline-capable, or device-connected unless implementation and tests support that statement.
5. Update the README, privacy disclosure, and architecture notes when data flows or external providers change.

## Local checks

```bash
node --check www/app.js
node --check www/network-diagnostics.js
node --test tests/network-diagnostics.test.cjs
```

For Android changes, also run Capacitor sync and a debug APK build using [README_ANDROID_INSTALL.md](README_ANDROID_INSTALL.md).

## Pull request checklist

- [ ] The change solves a documented problem.
- [ ] No credentials, tokens, personal data, or private keys are committed.
- [ ] User input is escaped before being inserted into HTML.
- [ ] Network requests have error/timeout handling and use HTTPS.
- [ ] Permission prompts are user-initiated and disclose relevant data transfers.
- [ ] UI states describe actual behaviour; unsupported features are labelled clearly.
- [ ] Tests and documentation are updated.
- [ ] Physical-device checks are identified when CI cannot cover them.

## Visual and copy standards

Keep the interface restrained and readable. Use the existing graphite, cyan, and amber visual language. Avoid decorative gradients, invented dashboard metrics, fake customer reviews, meaningless badges, and exaggerated marketing claims.
