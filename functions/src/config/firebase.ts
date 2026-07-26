import * as admin from 'firebase-admin';
import prisma from './database';

let storageInstance: any = null;
let bucketInstance: any = null;
let initialized = false;

export const loadFirebaseConfigFromDb = async () => {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'firebase-settings' }
    });
    if (record && record.settingData) {
      const data = typeof record.settingData === 'string'
        ? JSON.parse(record.settingData)
        : record.settingData as any;
      if (data && data.enabled && data.serviceAccount) {
        let sa = data.serviceAccount;
        if (typeof sa === 'string') {
          if (!sa.trim().startsWith('{')) {
            try {
              sa = Buffer.from(sa, 'base64').toString('utf-8');
            } catch (e) {
              // ignore
            }
          }
        }
        await setDynamicFirebaseConfig(sa, data.storageBucket || undefined);
        console.log("Loaded Firebase settings dynamically from database.");
      }
    }
  } catch (error) {
    console.error("Failed to load Firebase config from database:", error);
  }
};

let dynamicServiceAccount: any = null;
let dynamicStorageBucket: string | null = null;

export const setDynamicFirebaseConfig = async (serviceAccount: any, storageBucket?: string) => {
  dynamicServiceAccount = serviceAccount;
  if (storageBucket) {
    dynamicStorageBucket = storageBucket;
  }
  initialized = false;
  if (admin.apps.length > 0) {
    await Promise.all(admin.apps.map(async (app) => {
      try {
        await app.delete();
      } catch (e) {
        console.error("Error deleting firebase app during re-init:", e);
      }
    }));
  }
  // Re-trigger initialization
  getFirebaseAdmin();
};

export const getFirebaseAdmin = () => {
  if (!initialized) {
    if (!admin.apps.length) {
      try {
        let credential;
        let storageBucket = dynamicStorageBucket || process.env.APP_FIREBASE_STORAGE_BUCKET;

        if (dynamicServiceAccount) {
          try {
            const certObj = typeof dynamicServiceAccount === 'string' 
              ? JSON.parse(dynamicServiceAccount) 
              : dynamicServiceAccount;
            credential = admin.credential.cert(certObj);
          } catch (err) {
            console.error("Failed to load Firebase cert from dynamic settings:", err);
          }
        } else {
          const base64ServiceAccount = process.env.APP_FIREBASE_SERVICE_ACCOUNT_BASE64;
          if (base64ServiceAccount && base64ServiceAccount.trim() !== '' && base64ServiceAccount !== 'your_base64_encoded_service_account_json_here') {
            try {
              let decodedServiceAccount = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
              if (!decodedServiceAccount.trim().startsWith('{')) {
                if (base64ServiceAccount.trim().startsWith('{')) {
                  decodedServiceAccount = base64ServiceAccount;
                } else {
                  throw new Error('Not a JSON format');
                }
              }
              credential = admin.credential.cert(JSON.parse(decodedServiceAccount));
            } catch (parseError) {
              console.warn('Invalid Firebase Service Account JSON provided:', parseError instanceof Error ? parseError.message : parseError);
            }
          }
        }

        admin.initializeApp({
          credential,
          storageBucket,
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
  try {
    const b = getStorageBucket();
    if (b) {
      const file = b.file(destination);
      await file.save(fileBuffer, { metadata: { contentType: mimeType } });
      try {
        await file.makePublic();
      } catch (err) {
        console.warn("file.makePublic() skipped:", err);
      }
      return getFirebaseDownloadUrl(destination);
    }
  } catch (err) {
    console.warn("uploadFileToStorage fallback to direct URL:", err);
  }

  const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET || "ajr3dgalaxy.firebasestorage.app";
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(destination)}?alt=media`;
};

export const getFirebaseDownloadUrl = async (storagePath: string): Promise<string> => {
  try {
    const b = getStorageBucket();
    if (b) {
      const file = b.file(storagePath);
      const [exists] = await file.exists();
      if (exists) {
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        if (signedUrl) return signedUrl;
      }
    }
  } catch (err) {
    console.warn("getFirebaseDownloadUrl fallback to public URL format:", err);
  }

  const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET || "ajr3dgalaxy.firebasestorage.app";
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
};

