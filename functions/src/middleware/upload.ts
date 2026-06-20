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
        const bb = busboy({
          headers: req.headers,
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 1,
          },
        });

        let fileProcessed = false;
        let fileErrorOccurred = false;

        bb.on('file', (name, fileStream, info) => {
          const { filename: originalname, mimeType: mimetype, encoding } = info;

          if (name !== fieldname) {
            fileStream.resume();
            return;
          }

          // Validate mime type and extension
          const allowedExtensions = /jpeg|jpg|png|gif|webp|svg/;
          const mimeTypeValid = allowedExtensions.test(mimetype);
          const extNameValid = allowedExtensions.test(path.extname(originalname).toLowerCase());

          if (!mimeTypeValid || !extNameValid) {
            fileErrorOccurred = true;
            fileStream.resume();
            return next(new Error('Only web images are supported (JPG, PNG, GIF, WEBP, SVG)!'));
          }

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const filename = `${fieldname}-${uniqueSuffix}${path.extname(originalname)}`;
          const filepath = path.join(UPLOAD_DIR, filename);

          const writeStream = fs.createWriteStream(filepath);
          fileStream.pipe(writeStream);

          let fileSize = 0;
          fileStream.on('data', (data) => {
            fileSize += data.length;
          });

          fileStream.on('limit', () => {
            fileErrorOccurred = true;
            writeStream.destroy();
            try {
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }
            } catch (err) {}
            return next(new Error('File size limit exceeded (Max 10MB)!'));
          });

          writeStream.on('finish', () => {
            if (fileErrorOccurred) return;
            req.file = {
              fieldname,
              originalname,
              encoding,
              mimetype,
              destination: UPLOAD_DIR,
              filename,
              path: filepath,
              size: fileSize,
              buffer: Buffer.alloc(0), // Mock buffer field to satisfy multer type if required
              stream: fileStream,
            } as any;
            fileProcessed = true;
          });

          writeStream.on('error', (err) => {
            fileErrorOccurred = true;
            return next(err);
          });
        });

        bb.on('field', (name, val) => {
          if (!req.body) req.body = {};
          req.body[name] = val;
        });

        bb.on('close', () => {
          if (fileErrorOccurred) return;
          next();
        });

        bb.on('error', (err) => {
          return next(err);
        });

        const rawBody = (req as any).rawBody;
        if (rawBody) {
          bb.end(rawBody);
        } else {
          req.pipe(bb);
        }
      } catch (err) {
        return next(err);
      }
    };
  },
};