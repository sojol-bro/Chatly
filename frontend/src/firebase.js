import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Stitch — Firebase project: chatly-a60e7
const firebaseConfig = {
  apiKey: "AIzaSyDCXkh2yK5VT9Zh3-7lfMJlMvOlImfBMuI",
  authDomain: "chatly-a60e7.firebaseapp.com",
  databaseURL: "https://chatly-a60e7-default-rtdb.firebaseio.com",
  projectId: "chatly-a60e7",
  storageBucket: "chatly-a60e7.firebasestorage.app",
  messagingSenderId: "538079719825",
  appId: "1:538079719825:web:c8d215ba3a9d65abb26a30",
  measurementId: "G-XRCJPSFEXT"
};

const app = initializeApp(firebaseConfig);

// Firestore — primary NoSQL database for conversations & messages
export const db = getFirestore(app);

// Realtime Database — available for presence/typing indicators if needed
export const rtdb = getDatabase(app);

export default app;
