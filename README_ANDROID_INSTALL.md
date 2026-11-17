# J.A.R.V.I.S. Mark VII Tactical OS — Android Capacitor & PWA Package

## Option 1: Build a Real Installable Android `.APK` from Your Phone (Zero PC Needed via GitHub Actions)
1. Create a new repository on GitHub (from your phone browser or GitHub app) and upload the contents of this ZIP (`package.json`, `capacitor.config.json`, `www/`, `android/`, and `.github/workflows/build-android-apk.yml`).
2. Open the **Actions** tab in your GitHub repository — the **Build J.A.R.V.I.S. Android APK (Capacitor)** workflow runs automatically on Ubuntu with Node 20 + Java 17 + Android SDK.
3. Once completed (~2.5 minutes), download the **`JARVIS-Mark-VII-Android-APK`** artifact (`app-debug.apk`) and tap to install it directly on your Android phone!

## Option 2: Build Locally with Capacitor CLI & Android Studio
```bash
npm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Option 3: Instant Progressive Web App (PWA WebAPK) Install on Android Chrome
1. Host `www/` on GitHub Pages, Replit, or Vercel (or open `www/index.html` over localhost/HTTPS in Chrome for Android).
2. Tap Chrome's **⋮ Menu ➔ "Install app" / "Add to Home screen"**.
3. Android packages J.A.R.V.I.S. with the custom Arc Reactor icon and launches in 100% fullscreen standalone mode.
