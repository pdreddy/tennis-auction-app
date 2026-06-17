const firebaseConfig = {
    apiKey: "AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA",
    authDomain: "koc2-20fb8.firebaseapp.com",
    databaseURL: "https://koc2-20fb8-default-rtdb.firebaseio.com",
    projectId: "koc2-20fb8",
    storageBucket: "koc2-20fb8.firebasestorage.app",
    messagingSenderId: "317734341461",
    appId: "1:317734341461:web:1bcad5a1792fac0e46bddc"
};

export const DATA_PATHS = {
    config: "config",
    users: "users",
    auctions: "auctions",
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
