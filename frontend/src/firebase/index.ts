import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA",
  authDomain: "koc2-20fb8.firebaseapp.com",
  databaseURL: "https://koc2-20fb8-default-rtdb.firebaseio.com",
  projectId: "koc2-20fb8",
  storageBucket: "koc2-20fb8.firebasestorage.app",
  messagingSenderId: "317734341461",
  appId: "1:317734341461:web:1bcad5a1792fac0e46bddc",
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || defaultFirebaseConfig.databaseURL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing Firebase browser config: ${missingFirebaseConfig.join(", ")}. ` +
      "Set the EXPO_PUBLIC_FIREBASE_* variables in Netlify before deploying."
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
