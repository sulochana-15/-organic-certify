/* =============================================
   firebase-config.js — OrganicCertify
   =============================================

   ⚠️  SETUP REQUIRED — FOLLOW THESE STEPS:
   ─────────────────────────────────────────
   1. Go to https://console.firebase.google.com
   2. Click "Add project" → name it "organic-certify"
   3. Disable Google Analytics (optional) → Create project
   4. In the project, click "Web" icon (</>)
   5. Register app name "OrganicCertify" → click Register
   6. Copy the firebaseConfig values below
   7. In Firebase Console → Build → Authentication
      → Get started → Enable "Email/Password" and "Google"
   8. In Firebase Console → Build → Firestore Database
      → Create database → Start in test mode → choose region
   9. In Firebase Console → Build → Storage
      → Get started → Start in test mode

   ─────────────────────────────────────────
   REPLACE the placeholder values below ↓
   ============================================= */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/* ── Initialize Firebase ── */
let _firebaseReady = false;
let auth, db, storage;

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth    = firebase.auth();
  db      = firebase.firestore();
  storage = firebase.storage();

  // Enable Firestore offline persistence
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

  _firebaseReady = true;
  console.log('✅ Firebase initialized successfully');
} catch (err) {
  console.warn('⚠️ Firebase not configured yet. Running in local mode.', err.message);
}

const isFirebaseReady = () => _firebaseReady && firebaseConfig.apiKey !== "YOUR_API_KEY";

// Google Auth Provider
const googleProvider = _firebaseReady
  ? new firebase.auth.GoogleAuthProvider()
  : null;
