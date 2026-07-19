import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";

export let app: FirebaseApp | any;
export let db: Firestore | any;
export let auth: Auth | any;
export let storage: FirebaseStorage | any;

export const initFirebase = async () => {
  if (typeof window === "undefined") return { app, db, auth, storage };
  if (app) return { app, db, auth, storage }; // Already initialized

  const [fbApp, fbAuth, fbFirestore, fbStorage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  let firebaseConfig: any = null;
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const settingsData = await res.json();
      const pushConfig = settingsData?.data?.pushNotifications || settingsData?.data?.pushNotificationSettings;
      if (pushConfig && pushConfig.enabled && pushConfig.projectId && pushConfig.apiKey) {
        firebaseConfig = {
          apiKey: pushConfig.apiKey,
          authDomain: `${pushConfig.projectId}.firebaseapp.com`,
          projectId: pushConfig.projectId,
          storageBucket: `${pushConfig.projectId}.firebasestorage.app`,
          messagingSenderId: pushConfig.senderId,
          appId: pushConfig.appId,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to load Firebase configurations dynamically from settings:", err);
  }

  if (!firebaseConfig) {
    try {
      const res = await fetch("/firebase-applet-config.json");
      if (res.ok) {
        firebaseConfig = await res.json();
      } else {
        throw new Error(`HTTP status ${res.status}`);
      }
    } catch (err) {
      console.warn("Failed to dynamically load Firebase configurations from static file:", err);
    }
  }

  if (!firebaseConfig) {
    throw new Error("Firebase configuration could not be loaded.");
  }

  app = fbApp.initializeApp(firebaseConfig);
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  db = dbId
    ? fbFirestore.getFirestore(app, dbId)
    : fbFirestore.getFirestore(app);
  auth = fbAuth.getAuth(app);
  storage = fbStorage.getStorage(app);
  return { app, db, auth, storage };
};
