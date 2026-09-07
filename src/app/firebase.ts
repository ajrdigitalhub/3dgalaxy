import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";

export let app: FirebaseApp | any;
export let db: Firestore | any;
export let auth: Auth | any;
export let storage: FirebaseStorage | any;

const STATIC_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD4uCGuumfRefkteG6QjGrvFUW1FLMW3o8",
  authDomain: "ajr3dgalaxy.firebaseapp.com",
  projectId: "ajr3dgalaxy",
  storageBucket: "ajr3dgalaxy.firebasestorage.app",
  messagingSenderId: "111872927152",
  appId: "1:111872927152:web:b498fd9a072f776a2ae275",
  measurementId: "G-C9R96N5FR6",
};

/**
 * Lightweight Auth initialization - avoids pulling Firestore and Storage
 */
export const initFirebaseAuth = async () => {
  if (typeof window === "undefined") return { app, auth };
  if (auth) return { app, auth };

  const [fbApp, fbAuth] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);

  if (!app) {
    app = fbApp.initializeApp(STATIC_FIREBASE_CONFIG);
  }
  if (!auth) {
    auth = fbAuth.getAuth(app);
  }
  return { app, auth };
};

/**
 * Full Firebase initialization (auth, db, storage) loaded on-demand
 */
export const initFirebase = async () => {
  if (typeof window === "undefined") return { app, db, auth, storage };
  if (app && db && auth && storage) return { app, db, auth, storage };

  const [fbApp, fbAuth, fbFirestore, fbStorage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  if (!app) {
    app = fbApp.initializeApp(STATIC_FIREBASE_CONFIG);
  }
  if (!auth) {
    auth = fbAuth.getAuth(app);
  }
  if (!db) {
    db = fbFirestore.getFirestore(app);
  }
  if (!storage) {
    storage = fbStorage.getStorage(app);
  }

  return { app, db, auth, storage };
};
