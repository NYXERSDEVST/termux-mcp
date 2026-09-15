# Firebase (auth, hosting, Firestore, push)

Firebase is the fastest path if you want auth + a database + hosting
without running your own backend. This repo doesn't require Firebase (the
default is the in-memory/SQLite store in `database.md`), but it's a solid
option if you'd rather not run Postgres yourself.

## Setup

```bash
npm install -g firebase-tools
firebase login
firebase init   # pick Hosting, Firestore, and/or Authentication
```

## Hosting the dashboard PWA

```bash
cd packages/dashboard
npm run build
firebase deploy --only hosting
```

`firebase.json` hosting config for an SPA (rewrites all routes to
`index.html` so client-side routing works):

```json
{
  "hosting": {
    "public": "packages/dashboard/dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

## Auth

Firebase Auth (email/password, Google, GitHub, etc.) integrates client-side
via `firebase/auth`:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const app = initializeApp({ /* config from Firebase console */ });
const auth = getAuth(app);
await signInWithPopup(auth, new GoogleAuthProvider());
```

Verify the resulting ID token server-side in `packages/server` with the
Admin SDK (`firebase-admin`) before trusting any request claiming to be that
user.

## Firestore as your database

If you use Firestore instead of the Postgres/SQLite setup in
`database.md`, keep server-side writes going through `firebase-admin`
(service account credentials, never the client SDK) so your security rules
aren't your only line of defense.

## Push notifications (FCM)

Cloud Messaging pairs with the PWA's service worker
(`packages/dashboard/public/sw.js`) via `firebase/messaging`'s
`getToken()`/`onMessage()` — needed if you want the "full AI-driven
notifications" flow to actually push to a device, not just show an in-app
toast.
