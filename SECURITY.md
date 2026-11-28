# Security policy

## Scope

J.A.R.V.I.S. Mark VII is an experimental client-side application. It is not a security product and has not completed a full security audit.

## Known limitations

- Workspace information is stored in browser/app local storage and is not encrypted by the app.
- The optional Gemini API key is held in the client. A user or browser extension with page access can inspect it. Do not distribute a shared production key.
- The custom Web Worker code runner has a time limit and reduced application context, but it is not a hardened sandbox for arbitrary untrusted code.
- Network diagnostics and location features contact third-party providers when the user explicitly enables them.
- A debug APK is not a release-signed production package.

## Reporting a vulnerability

Do not publish credentials, private keys, exploit details, or personal data in a public issue. If GitHub private vulnerability reporting is enabled for this repository, use the repository's **Security → Report a vulnerability** flow. Otherwise, contact the repository owner through the private contact method listed on their GitHub profile.

Please include the affected version or commit, the impacted component, reproducible steps, and the security impact. Avoid testing against other people's devices or accounts.

## Response expectations

This is a personal project and does not currently publish a guaranteed response time or service-level agreement. A report is not a promise that a fix or release will be available by a particular date.
