import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Local User logic instead of Firebase Auth
const LOCAL_USER_KEY = "tasker_local_user_id";
export const getLocalUser = () => {
  let uid = localStorage.getItem(LOCAL_USER_KEY);
  if (!uid) {
    uid = "user_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(LOCAL_USER_KEY, uid);
  }
  return { uid, displayName: "Guest User" };
};
export const login = () => Promise.resolve();
export const logout = () => {
  localStorage.removeItem(LOCAL_USER_KEY);
  return Promise.resolve();
};
