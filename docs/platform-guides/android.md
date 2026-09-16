# Android: PWA → TWA (APK/AAB)

The dashboard app in `packages/dashboard` is a PWA. The fastest real path to
an installable Android app from a PWA is a **Trusted Web Activity (TWA)** —
a thin native shell that points at your hosted PWA, not a rewrite.

## Prerequisites

- The PWA deployed at a public HTTPS URL (manifest + service worker served,
  see `packages/dashboard/public/manifest.webmanifest`)
- Android Studio (for a local build) *or* just the command-line tools if you
  only need Bubblewrap's generated Gradle project
- Node.js ≥ 20

## Fastest path: Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://your-domain/manifest.webmanifest
# answer the prompts (package id, key store, app name)
bubblewrap build
```

This produces:
- `app-release-signed.apk` — sideloadable APK
- `app-release-bundle.aab` — the format the Play Console requires

## Digital Asset Links (required for full-screen, no browser chrome)

Host this at `https://your-domain/.well-known/assetlinks.json` so Android
trusts your APK as the verified owner of the domain:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourorg.yourapp",
    "sha256_cert_fingerprints": ["<from bubblewrap's keystore>"]
  }
}]
```

Get the fingerprint: `keytool -list -v -keystore android.keystore`

## Play Console deploy

1. Create an app in the [Play Console](https://play.google.com/console)
2. Upload the `.aab` under Production (or Internal testing first)
3. Fill in the store listing, content rating, and data-safety form
4. Roll out — review typically takes hours to a few days

## Native alternative (Capacitor)

If you need real native APIs (camera, filesystem, push) beyond what a TWA's
web APIs expose, wrap the same PWA in [Capacitor](https://capacitorjs.com/)
instead:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap sync
npx cap open android   # opens Android Studio
```
