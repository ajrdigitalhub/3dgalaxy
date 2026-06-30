import { Request, Response, NextFunction } from 'express';
import busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import os from 'os';

const UPLOAD_DIR = path.join(os.tmpdir(), 'uploads');

// Ensure directory exists in the temporary file system
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const upload = {
  single: (fieldname: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return next();
      }

      try {
        console.log('[UPLOAD] Content-Type:', contentType);

        const bb = busboy({
          headers: req.headers,
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 1,
          },
        });

        let fileHandled = false;
        let busboyFinished = false;
        let writeFinished = false;
        let errorOccurred = false;

        // Called once both busboy AND writeStream are done
        const tryNext = () => {
          if (errorOccurred) return;
          if (busboyFinished && (writeFinished || !fileHandled)) {
            console.log('[UPLOAD] All done. req.file:', req.file ? req.file.filename : 'NOT SET');
            next();
          }
        };

        bb.on('file', (name, fileStream, info) => {
          const { filename: originalname, mimeType: mimetype, encoding } = info;
          console.log('[UPLOAD] file event — field:', name, 'file:', originalname, 'mime:', mimetype);

          if (name !== fieldname) {
            console.log('[UPLOAD] field mismatch, expected:', fieldname, 'got:', name);
            fileStream.resume();
            return;
          }

          fileHandled = true;

          // Validate mime type and extension
          const allowedExtensions = /jpeg|jpg|png|gif|webp|svg/;
          const mimeTypeValid = allowedExtensions.test(mimetype);
          const extNameValid = allowedExtensions.test(path.extname(originalname).toLowerCase());

          if (!mimeTypeValid || !extNameValid) {
            console.log('[UPLOAD] invalid mime/ext:', mimetype, originalname);
            errorOccurred = true;
            fileStream.resume();
            return next(new Error('Only web images are supported (JPG, PNG, GIF, WEBP, SVG)!'));
          }

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const filename = `${fieldname}-${uniqueSuffix}${path.extname(originalname)}`;
          const filepath = path.join(UPLOAD_DIR, filename);

          const writeStream = fs.createWriteStream(filepath);
          fileStream.pipe(writeStream);

          let fileSize = 0;
          fileStream.on('data', (data: Buffer) => {
            fileSize += data.length;
          });

          fileStream.on('limit', () => {
            console.log('[UPLOAD] file size limit exceeded');
            errorOccurred = true;
            writeStream.destroy();
            try {
              if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (_) {}
            return next(new Error('File size limit exceeded (Max 10MB)!'));
          });

          writeStream.on('finish', () => {
            if (errorOccurred) return;
            req.file = {
              fieldname,
              originalname,
              encoding,
              mimetype,
              destination: UPLOAD_DIR,
              filename,
              path: filepath,
              size: fileSize,
              buffer: Buffer.alloc(0),
              stream: fileStream,
            } as any;
            console.log('[UPLOAD] writeStream finished. file saved:', filepath, 'size:', fileSize);
            writeFinished = true;
            tryNext();
          });

          writeStream.on('error', (err) => {
            console.log('[UPLOAD] writeStream error:', err);
            errorOccurred = true;
            return next(err);
          });
        });

        bb.on('field', (name, val) => {
          if (!req.body) req.body = {};
          req.body[name] = val;
        });

        bb.on('close', () => {
          console.log('[UPLOAD] busboy close. fileHandled:', fileHandled, 'writeFinished:', writeFinished);
          busboyFinished = true;
          tryNext();
        });

        bb.on('error', (err) => {
          console.log('[UPLOAD] busboy error:', err);
          errorOccurred = true;
          return next(err);
        });

        // Resume the stream (it may have been paused) then pipe to busboy
        req.resume();
        req.pipe(bb);

      } catch (err) {
        console.log('[UPLOAD] unexpected error:', err);
        return next(err);
      }
    };
  },
};