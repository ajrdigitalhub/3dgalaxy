import { Injectable } from "@angular/core";
import { initFirebase } from "../../firebase";

@Injectable({
  providedIn: "root",
})
export class FirebaseStorageService {
  /**
   * Upload file to Firebase Storage bucket at specified storagePath
   * Returns Firebase Storage download URL
   */
  async uploadFile(file: File, storagePath: string): Promise<string> {
    try {
      const fb = await initFirebase();
      if (fb && fb.storage) {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const fileRef = ref(fb.storage, storagePath);
        console.log(`[FirebaseStorage] Uploading "${file.name}" to "${storagePath}"...`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`[FirebaseStorage] Upload successful! Download URL: ${downloadUrl}`);
        return downloadUrl;
      } else {
        console.error("[FirebaseStorage] Firebase Storage instance not initialized.");
      }
    } catch (err) {
      console.error("[FirebaseStorage] Upload error:", err);
    }
    return "";
  }
}
