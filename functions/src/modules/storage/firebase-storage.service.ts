import { getStorageBucket, getFirebaseAdmin } from '../../config/firebase';
import path from 'path';

export class FirebaseStorageService {
  /**
   * Upload a file buffer to Firebase Storage and return the public URL.
   */
  static async uploadFile(
    fileBuffer: Buffer,
    destination: string,
    mimeType: string
  ): Promise<string> {
    let bucket = getStorageBucket();
    if (!bucket) {
      try {
        const fbAdmin = getFirebaseAdmin();
        if (fbAdmin.apps.length > 0) {
          const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET || 'ajr3dgalaxy.firebasestorage.app';
          bucket = fbAdmin.storage().bucket(bucketName);
        }
      } catch (reInitErr) {
        console.error('Re-init bucket attempt failed:', reInitErr);
      }
    }

    if (!bucket) {
      throw new Error('Firebase Storage is not initialized properly. Please check your APP_FIREBASE_STORAGE_BUCKET environment variable.');
    }

    const file = bucket.file(destination);
    await file.save(fileBuffer, {
      metadata: { contentType: mimeType },
      resumable: false,
    });
    
    try {
      await file.makePublic();
    } catch (aclErr: any) {
      console.warn('file.makePublic() skipped or not supported with uniform bucket access:', aclErr?.message || aclErr);
    }
    
    // We can return the direct googleapis public URL
    const bucketName = bucket.name || process.env.APP_FIREBASE_STORAGE_BUCKET || 'ajr3dgalaxy.firebasestorage.app';
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
  }

  /**
   * Delete a file from Firebase Storage given its URL or path.
   */
  static async deleteFile(fileUrlOrPath: string): Promise<void> {
    if (!fileUrlOrPath) return;

    let bucket = getStorageBucket();
    if (!bucket) {
      try {
        const fbAdmin = getFirebaseAdmin();
        if (fbAdmin.apps.length > 0) {
          const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET || 'ajr3dgalaxy.firebasestorage.app';
          bucket = fbAdmin.storage().bucket(bucketName);
        }
      } catch {
        // ignore
      }
    }

    if (!bucket) {
      console.warn('Firebase Storage not initialized, skipping deletion of', fileUrlOrPath);
      return;
    }

    let storagePath = '';

    try {
      if (fileUrlOrPath.startsWith('http://') || fileUrlOrPath.startsWith('https://')) {
        const url = new URL(fileUrlOrPath);
        
        if (url.hostname === 'storage.googleapis.com') {
          // Format: https://storage.googleapis.com/bucket-name/path/to/file.jpg
          const pathParts = url.pathname.split('/');
          // pathParts[0] is empty, pathParts[1] is bucket name, rest is storage path
          if (pathParts.length > 2) {
            storagePath = pathParts.slice(2).join('/');
          }
        } else if (url.hostname === 'firebasestorage.googleapis.com') {
          // Format: https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile.jpg?alt=media
          const pathParts = url.pathname.split('/o/');
          if (pathParts.length > 1) {
            const rawPath = pathParts[1].split('?')[0];
            storagePath = decodeURIComponent(rawPath);
          }
        }
      } else {
        // Assume it's a direct storage path
        storagePath = fileUrlOrPath;
      }

      if (storagePath) {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          console.log(`Successfully deleted file from Firebase Storage: ${storagePath}`);
        } else {
          console.log(`File does not exist in Firebase Storage, skipping: ${storagePath}`);
        }
      }
    } catch (error: any) {
      console.error(`Failed to delete file from Firebase Storage (${fileUrlOrPath}):`, error.message);
    }
  }
}
