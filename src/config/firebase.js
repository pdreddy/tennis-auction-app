const env = import.meta.env || {};

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "koc2-20fb8.firebaseapp.com",
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://koc2-20fb8-default-rtdb.firebaseio.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "koc2-20fb8",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "koc2-20fb8.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "317734341461",
    appId: env.VITE_FIREBASE_APP_ID || "1:317734341461:web:1bcad5a1792fac0e46bddc"
};

export const DATA_PATHS = {
    config: env.VITE_FIREBASE_CONFIG_PATH || "config",
    users: env.VITE_FIREBASE_USERS_PATH || "users",
    auctions: env.VITE_FIREBASE_AUCTIONS_PATH || "auctionsdata",
    connected: ".info/connected"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

export const db = firebase.database();

export const configRef = () => db.ref(DATA_PATHS.config);
export const usersRef = () => db.ref(DATA_PATHS.users);
export const userRef = code => db.ref(`${DATA_PATHS.users}/${code}`);
export const auctionsRef = () => db.ref(DATA_PATHS.auctions);
export const auctionRef = sessionId => db.ref(`${DATA_PATHS.auctions}/${sessionId}`);
export const connectedRef = () => db.ref(DATA_PATHS.connected);
export const rootRef = () => db.ref();
