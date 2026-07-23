import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a user-friendly error message from any error object,
 * while logging the full technical details to the developer console.
 * Never exposes API URLs, status text, stack traces, or raw HTTP responses to the UI.
 */
export function getFriendlyErrorMessage(error: any): string {
  // If it's already a string, check for technical details and sanitize if needed
  if (typeof error === 'string') {
    return sanitizeTechnicalText(error);
  }

  // Handle Angular HttpErrorResponse
  if (error instanceof HttpErrorResponse) {
    // Log complete technical details to console for developer debugging
    console.error('[HTTP ERROR DETAILS]:', {
      url: error.url,
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      errorBody: error.error,
      headers: error.headers?.keys()
    });

    // 1. Try to extract message/error from error body
    if (error.error) {
      if (typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          const msg = extractMessageFromObject(parsed);
          if (msg) return sanitizeTechnicalText(msg);
        } catch {
          const msg = sanitizeTechnicalText(error.error);
          if (msg) return msg;
        }
      } else if (typeof error.error === 'object') {
        const msg = extractMessageFromObject(error.error);
        if (msg) return sanitizeTechnicalText(msg);
      }
    }

    // 2. Status-code based user-friendly fallbacks
    switch (error.status) {
      case 0:
        return 'Network error. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please verify your inputs and try again.';
      case 401:
        return 'Session expired or unauthorized. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'The requested resource could not be found.';
      case 422:
        return 'Validation failed. Please correct the highlighted errors.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Unable to process your request. Our server encountered an issue. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  // Handle standard Javascript Error objects
  if (error instanceof Error) {
    console.error('[APPLICATION ERROR STACK]:', error);
    return sanitizeTechnicalText(error.message);
  }

  // Handle arbitrary objects (e.g. custom error response structures)
  if (error && typeof error === 'object') {
    // Check if it has standard fields
    const msg = extractMessageFromObject(error);
    if (msg) return sanitizeTechnicalText(msg);
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Extracts the first non-empty error message from a standard backend response object.
 */
function extractMessageFromObject(obj: any): string | null {
  if (!obj) return null;

  // Check 'message' property
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return obj.message;
  }

  // Check 'error' property (Brahma backend uses status(401).json({ error: 'Incorrect password' }))
  if (typeof obj.error === 'string' && obj.error.trim()) {
    return obj.error;
  }

  // Check 'errors' array
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const firstErr = obj.errors[0];
    if (typeof firstErr === 'string') return firstErr;
    if (firstErr && typeof firstErr.message === 'string') return firstErr.message;
  }

  // Check nested validation 'errors' object (e.g. { errors: { email: ['Email is invalid'] } })
  if (obj.errors && typeof obj.errors === 'object') {
    const keys = Object.keys(obj.errors);
    if (keys.length > 0) {
      const firstKeyErrors = obj.errors[keys[0]];
      if (Array.isArray(firstKeyErrors) && firstKeyErrors.length > 0) {
        return firstKeyErrors[0];
      }
      if (typeof firstKeyErrors === 'string') {
        return firstKeyErrors;
      }
    }
  }

  return null;
}

/**
 * Checks if a string contains technical or internal debugging terms,
 * and if so, returns a generic user-friendly fallback message.
 */
function sanitizeTechnicalText(text: string): string {
  if (!text) return 'Something went wrong. Please try again.';

  const lowerText = text.toLowerCase();

  // Patterns indicating technical debugging information
  const technicalPatterns = [
    'http failure response',
    'http://',
    'https://',
    'localhost',
    'stack trace',
    'axios',
    'fetch',
    'httperrorresponse',
    'internal server error',
    'sql',
    'prisma',
    'database',
    'postgres',
    'mongodb',
    'syntax error',
    'typeerror',
    'undefined',
    'null',
    'referenceerror',
    'cannot read property',
    'api/',
    'endpoint',
    '.js:',
    '.ts:',
    'connection refused',
    'cors'
  ];

  const containsTechnical = technicalPatterns.some(pattern => lowerText.includes(pattern));
  if (containsTechnical) {
    return 'Something went wrong. Please try again.';
  }

  return text;
}
