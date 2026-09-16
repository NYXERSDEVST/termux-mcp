# iOS: PWA → App Store

iOS has no TWA equivalent — Safari's home-screen PWA support covers basic
install (Add to Home Screen), but for the App Store you need a native
wrapper. Two real options:

## Option A: Capacitor (recommended, shares code with the Android build)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap sync
npx cap open ios   # opens Xcode
```

Requirements: a Mac with Xcode, an Apple Developer account ($99/year) for
App Store distribution, a bundle identifier, and signing certificates
(Xcode → Signing & Capabilities can auto-manage these with your Apple ID).

## Option B: Home-screen PWA only (no App Store, no Mac needed)

For internal/limited distribution, iOS Safari installs a PWA directly from
`manifest.webmanifest` + these meta tags in your HTML head:

```html
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Nyxers Cloud Dev">
```

Limitations vs. a native wrapper: no push notifications (until iOS 16.4+,
and only when launched from the home screen), no background sync, storage
can be evicted after ~7 days of inactivity in some iOS versions.

## App Store submission (Capacitor path)

1. Archive in Xcode (Product → Archive)
2. Upload via Xcode Organizer or `xcrun altool`/Transporter
3. Create the app record in [App Store Connect](https://appstoreconnect.apple.com/)
4. Fill in privacy nutrition labels (required — list every data type your
   `packages/server` backend collects, if any)
5. Submit for review — typically 24–48 hours
