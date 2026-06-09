import * as admin from 'firebase-admin';

// Check if Firebase is already initialized
if (!admin.apps.length) {
  try {
    const base64ServiceAccount = process.env.APP_FIREBASE_SERVICE_ACCOUNT_BASE64;
    let credential;

    if (base64ServiceAccount) {
      const decodedServiceAccount = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
      credential = admin.credential.cert(JSON.parse(decodedServiceAccount));
    } else {
      console.warn('Firebase Service Account is missing. Storage functionality might fail.');
      credential = admin.credential.applicationDefault();
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

export const storage = admin.storage();
const bucket = storage.bucket();

/**
 * Uploads a file buffer to Firebase Storage and returns the public download URL.
 * @param fileBuffer The file content buffer
 * @param destination The destination path in the bucket
 * @param mimeType The file's MIME type
 * @returns {Promise<string>} The public download URL
 */
export const uploadFileToStorage = async (
  fileBuffer: Buffer,
  destination: string,
  mimeType: string
): Promise<string> => {
  const file = bucket.file(destination);

  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
    },
  });

  // Make the file publicly accessible
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${destination}`;
};
