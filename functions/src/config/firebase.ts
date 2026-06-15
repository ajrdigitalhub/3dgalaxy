import * as admin from 'firebase-admin';

let storageInstance: any = null;
let bucketInstance: any = null;
let initialized = false;

export const getFirebaseAdmin = () => {
  if (!initialized) {
    if (!admin.apps.length) {
      try {
        const base64ServiceAccount = process.env.APP_FIREBASE_SERVICE_ACCOUNT_BASE64;
        let credential;

        if (base64ServiceAccount && base64ServiceAccount !== 'your_base64_encoded_service_account_json_here') {
          try {
            let decodedServiceAccount = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
            if (!decodedServiceAccount.trim().startsWith('{')) {
              decodedServiceAccount = base64ServiceAccount;
            }
            credential = admin.credential.cert(JSON.parse(decodedServiceAccount));
          } catch (parseError) {
            console.warn('Invalid Firebase Service Account JSON provided.');
          }
        }

        admin.initializeApp({
          credential,
          storageBucket: process.env.APP_FIREBASE_STORAGE_BUCKET,
        });
        console.log('Firebase Admin SDK initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
      }
    }
    initialized = true;
  }
  return admin;
};

export const getStorageBucket = () => {
  if (!bucketInstance) {
    const fbAdmin = getFirebaseAdmin();
    if (fbAdmin.apps.length > 0) {
      storageInstance = fbAdmin.storage();
      bucketInstance = storageInstance.bucket();
    }
  }
  return bucketInstance;
};

export const uploadFileToStorage = async (
  fileBuffer: Buffer,
  destination: string,
  mimeType: string
): Promise<string> => {
  const b = getStorageBucket();
  if (!b) throw new Error("Firebase Storage is not initialized properly.");
  
  const file = b.file(destination);
  await file.save(fileBuffer, { metadata: { contentType: mimeType } });
  await file.makePublic();
  return `https://storage.googleapis.com/${b.name}/${destination}`;
};

