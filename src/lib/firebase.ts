import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Note: This config will be populated by the set_up_firebase tool.
// If not already set, you should provide your credentials manually here.
let firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_KEY",
  authDomain: "PROJECT.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

try {
  // @ts-ignore - this file is generated dynamically by the tool
  const config = await import('../../firebase-applet-config.json');
  firebaseConfig = config.default;
} catch (e) {
  console.warn("Firebase config file not found, using placeholders. Please run Firebase setup.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); auth.useDeviceLanguage();

export default app;
