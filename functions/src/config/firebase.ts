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

