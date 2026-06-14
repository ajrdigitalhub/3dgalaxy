import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

export let app: FirebaseApp | any;
export let db: Firestore | any;
export let auth: Auth | any;

export const initFirebase = async () => {
  if (typeof window === 'undefined') return { app, db, auth };
  if (app) return { app, db, auth }; // Already initialized
  
  const [fbApp, fbAuth, fbFirestore] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore')
  ]);

  let firebaseConfig: any = null;
  try {
    const res = await fetch('/firebase-applet-config.json');
    if (res.ok) {
      firebaseConfig = await res.json();
    } else {
      throw new Error(`HTTP status ${res.status}`);
    }
  } catch (err) {
    console.warn('Failed to dynamically load Firebase configurations:', err);
  }

  if (!firebaseConfig) {
    throw new Error('Firebase configuration could not be loaded.');
  }

  app = fbApp.initializeApp(firebaseConfig);
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  db = dbId ? fbFirestore.getFirestore(app, dbId) : fbFirestore.getFirestore(app);
  auth = fbAuth.getAuth(app);
  return { app, db, auth };
};
