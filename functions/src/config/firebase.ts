import * as admin from 'firebase-admin';
import prisma, { isPoolHealthy } from './database';

let storageInstance: any = null;
let bucketInstance: any = null;
let initialized = false;

export const loadFirebaseConfigFromDb = async () => {
  try {
    const healthy = await isPoolHealthy();
    if (!healthy) {
      console.warn("⚠️ Could not load Firebase config from DB (Database unavailable, using default environment config)");
      return;
    }

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
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (/ENOTFOUND|ECONNREFUSED|Can't reach database server|getaddrinfo/i.test(msg) || error?.code === 'ENOTFOUND') {
      console.warn("⚠️ Could not load Firebase config from DB (Database unavailable, using default environment config)");
    } else {
      console.error("Failed to load Firebase config from database:", error);
    }
  }
};

let dynamicServiceAccount: any = null;
let dynamicStorageBucket: string | null = null;

const DEFAULT_STORAGE_BUCKET = 'ajr3dgalaxy.firebasestorage.app';
const DEFAULT_PROJECT_ID = 'ajr3dgalaxy';
const DEFAULT_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@ajr3dgalaxy.iam.gserviceaccount.com';

export const parseOrRepairServiceAccount = (saInput: any): any => {
  if (!saInput) return null;
  let rawStr = typeof saInput === 'string' ? saInput.trim() : '';
  
  if (rawStr && !rawStr.startsWith('{')) {
    try {
      rawStr = Buffer.from(rawStr, 'base64').toString('utf-8');
    } catch {
      // ignore
    }
  }

  let obj: any = null;
  if (rawStr && rawStr.startsWith('{')) {
    try {
      obj = JSON.parse(rawStr);
    } catch (e) {
      const keyMatch = rawStr.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
      if (keyMatch) {
        obj = {
          type: 'service_account',
          project_id: DEFAULT_PROJECT_ID,
          private_key: keyMatch[0].replace(/\\n/g, '\n'),
          client_email: DEFAULT_CLIENT_EMAIL
        };
      }
    }
  } else if (typeof saInput === 'object' && saInput !== null) {
    obj = { ...saInput };
  }

  if (obj) {
    if (!obj.client_email) obj.client_email = DEFAULT_CLIENT_EMAIL;
    if (!obj.project_id) obj.project_id = DEFAULT_PROJECT_ID;
    if (obj.private_key && typeof obj.private_key === 'string') {
      obj.private_key = obj.private_key.replace(/\\n/g, '\n');
    }
  }
  return obj;
};

export const setDynamicFirebaseConfig = async (serviceAccount: any, storageBucket?: string) => {
  dynamicServiceAccount = serviceAccount;
  if (storageBucket) {
    dynamicStorageBucket = storageBucket;
  }
  initialized = false;
  bucketInstance = null;
  storageInstance = null;
  if (admin.apps.length > 0) {
    await Promise.all(admin.apps.map(async (app) => {
      try {
        if (app) await app.delete();
      } catch (e) {
        console.error("Error deleting firebase app during re-init:", e);
      }
    }));
  }
  // Re-trigger initialization
  getFirebaseAdmin();
};

export const getFirebaseAdmin = () => {
  if (!initialized || admin.apps.length === 0) {
    if (!admin.apps.length) {
      try {
        let credential: admin.credential.Credential | undefined;
        const bucketName = dynamicStorageBucket || process.env.APP_FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;

        if (dynamicServiceAccount) {
          try {
            const certObj = parseOrRepairServiceAccount(dynamicServiceAccount);
            if (certObj && certObj.private_key) {
              credential = admin.credential.cert(certObj);
            }
          } catch (err) {
            console.error("Failed to load Firebase cert from dynamic settings:", err);
          }
        }

        if (!credential) {
          const base64ServiceAccount = process.env.APP_FIREBASE_SERVICE_ACCOUNT_BASE64;
          if (base64ServiceAccount && base64ServiceAccount.trim() !== '' && base64ServiceAccount !== 'your_base64_encoded_service_account_json_here') {
            try {
              const certObj = parseOrRepairServiceAccount(base64ServiceAccount);
              if (certObj && certObj.private_key) {
                credential = admin.credential.cert(certObj);
              }
            } catch (parseError) {
              console.warn('Invalid Firebase Service Account JSON provided:', parseError instanceof Error ? parseError.message : parseError);
            }
          }
        }

        if (!credential) {
          try {
            credential = admin.credential.applicationDefault();
            console.log("Using Google Application Default Credentials for Firebase Admin.");
          } catch {
            // ADC may not be available locally without gcloud auth
          }
        }

        const appOptions: admin.AppOptions = {
          storageBucket: bucketName,
          projectId: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID,
        };

        if (credential) {
          appOptions.credential = credential;
        }

        admin.initializeApp(appOptions);
        console.log('Firebase Admin SDK initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
      }
    }
    if (admin.apps.length > 0) {
      initialized = true;
    }
  }
  return admin;
};

export const getStorageBucket = () => {
  if (!bucketInstance) {
    const fbAdmin = getFirebaseAdmin();
    if (fbAdmin.apps.length > 0) {
      try {
        storageInstance = fbAdmin.storage();
        const bucketName = dynamicStorageBucket || process.env.APP_FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
        bucketInstance = storageInstance.bucket(bucketName);
      } catch (err) {
        console.error("Failed to acquire bucket instance:", err);
      }
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

