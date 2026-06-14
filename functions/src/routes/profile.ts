import express from 'express';
import Busboy from 'busboy';
import path from 'path';
import { bucket } from '../config/firebase'; // Ensure this exists and exports `bucket`

const router = express.Router();

router.post('/image', (req: any, res: any) => {
  // If we are using standard express, we might not have req.rawBody unless using raw body parser.
  // Instead of relying strictly on req.rawBody, we can stream req directly if it's not consumed.
  // If express.json() / express.urlencoded() already consumed the stream, busboy will hang.
  // Assuming req is an unconsumed stream for this route.
  
  const headers = req.headers;
  const busboy = Busboy({ headers });
  const uploadPromises: Promise<any>[] = [];

  busboy.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    
    if (!bucket) {
      console.error('Upload attempted but bucket is not initialized');
      file.resume();
      return;
    }

    const promise = new Promise((resolve, reject) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newFileName = uniqueSuffix + path.extname(filename);

      const blob = bucket.file(`uploads/${newFileName}`);
      const blobStream = blob.createWriteStream({
        metadata: { contentType: mimeType },
        resumable: false
      });

      blobStream.on('error', (err: any) => {
        console.error('Blob stream error:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        try {
          // getSignedUrl or just make it public.
          // Since our uploadFileToStorage uses makePublic, let's make it public.
          await blob.makePublic();
          const url = `https://storage.googleapis.com/${bucket.name}/uploads/${newFileName}`;
          resolve({ url, fileName: newFileName });
        } catch (err: any) {
          reject(err);
        }
      });

      file.pipe(blobStream);
    });

    uploadPromises.push(promise);
  });

  busboy.on('finish', async () => {
    try {
      const results = await Promise.all(uploadPromises);
      if (results.length === 1) {
        res.json({
          success: true,
          url: results[0].url,
          fileName: results[0].fileName
        });
      } else {
        res.json({
          success: true,
          urls: results.map((r: any) => r.url),
          files: results
        });
      }
    } catch (err: any) {
      console.error('Upload processing error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload failed', message: err.message });
      }
    }
  });

  busboy.on('error', (err: any) => {
    console.error('Busboy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Parsing failed: ${err.message}` });
    }
  });

  // If using generic Express without body-parser for this route:
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
});

export default router;
