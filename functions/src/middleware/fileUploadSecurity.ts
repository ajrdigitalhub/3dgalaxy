import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const ALLOWED_EXTENSIONS = ['.stl', '.3mf', '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.csv'];
const ALLOWED_MIME_TYPES = [
  'model/stl',
  'application/sla',
  'application/vnd.ms-pki.stl',
  'model/3mf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/csv',
  'application/octet-stream',
];

/**
 * Sanitizes uploaded filename to prevent directory traversal and script injection.
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return `file_${Date.now()}`;
  // Remove directory traversal patterns
  const basename = path.basename(filename).replace(/(\.\.[\/\\])+/g, '');
  // Sanitize non-alphanumeric characters except dot, dash, underscore
  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(safeName).toLowerCase();
  const nameWithoutExt = path.basename(safeName, ext);

  // Generate safe random UUID filename prefix
  const randomPrefix = crypto.randomBytes(8).toString('hex');
  return `${nameWithoutExt}_${randomPrefix}${ext}`;
};

/**
 * Validates uploaded file extension and MIME type.
 */
export const validateUploadedFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = (req as any).file || ((req as any).files && (req as any).files[0]);
  if (!file) return next();

  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn('File upload rejected: Disallowed extension', {
      originalName: file.originalname,
      ext,
      mimeType,
    }, {
      requestId: (req as any).requestId,
      module: 'SECURITY',
      errorCode: 'FILE_UPLOAD_REJECTED',
    });

    return res.status(400).json({
      success: false,
      error: `File type '${ext}' is not permitted for security reasons. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      requestId: (req as any).requestId,
    });
  }

  // Validate MIME type
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    logger.warn('File upload rejected: Disallowed MIME type', {
      originalName: file.originalname,
      ext,
      mimeType,
    }, {
      requestId: (req as any).requestId,
      module: 'SECURITY',
      errorCode: 'FILE_UPLOAD_REJECTED',
    });

    return res.status(400).json({
      success: false,
      error: 'File MIME type is not allowed',
      requestId: (req as any).requestId,
    });
  }

  next();
};
