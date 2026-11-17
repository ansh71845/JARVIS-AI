# J.A.R.V.I.S. Mark VII

Original JARVIS web application packaged for Capacitor Android.

## Build an Android APK

This repository includes a GitHub Actions workflow. After pushing to `main`, open the repository's **Actions** tab, select **Build J.A.R.V.I.S. Android APK**, and download the `JARVIS-Mark-VII-Android-APK` artifact when the run succeeds.

You can also run locally:

```bash
npm install
npx cap add android
cp android-template/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.

The debug APK is for testing and is not a Play Store release-signed APK. Review app permissions and external service/API configuration before distributing it.
