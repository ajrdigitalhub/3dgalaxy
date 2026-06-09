import { FirebaseApp, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

let firebaseApp: FirebaseApp;
let db: Firestore;

function getDb(): Firestore {
  if (!db) {
    firebaseApp = initializeApp(firebaseConfig);
    const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    db = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
  }
  return db;
}

export type TemplateParams = Record<string, string | number | undefined>;

export async function insertWhatsAppLog(data: {
  recipientNumber: string;
  messageContent: string;
  status: string;
  reason: string | null;
  templateName: string;
  parameters: TemplateParams;
}) {
  return await addDoc(collection(getDb(), 'whatsapp_logs'), {
    ...data,
    date: new Date().toISOString()
  });
}

export async function fetchWhatsAppLogs(limitCount: number = 100) {
  const q = query(collection(getDb(), 'whatsapp_logs'), orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
