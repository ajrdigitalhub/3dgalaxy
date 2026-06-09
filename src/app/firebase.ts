import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

export let app: FirebaseApp | any;
export let db: Firestore | any;
export let auth: Auth | any;

export const initFirebase = async () => {
  if (typeof window === 'undefined') return { app, db, auth };
  if (app) return { app, db, auth }; // Already initialized
  
  const [fbApp, fbAuth, fbFirestore, config] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('../../firebase-applet-config.json', { with: { type: 'json' } })
  ]);
  const firebaseConfig = config.default || config;
  app = fbApp.initializeApp(firebaseConfig);
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  db = dbId ? fbFirestore.getFirestore(app, dbId) : fbFirestore.getFirestore(app);
  auth = fbAuth.getAuth(app);
  return { app, db, auth };
};
