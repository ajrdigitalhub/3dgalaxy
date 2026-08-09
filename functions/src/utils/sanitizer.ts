/**
 * HTML Sanitization and SSRF URL Validation Utility
 */

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

/**
 * Strips dangerous HTML elements, scripts, inline event handlers, and javascript: URIs.
 */
export const sanitizeHtml = (input: any): string => {
  if (typeof input !== 'string') return input;

  let clean = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }

  // Escape lone angle brackets that might form malformed tags
  clean = clean.replace(/<(?!\/?(p|br|b|i|strong|em|u|span|div|ul|ol|li|a)\b)/gi, '&lt;');

  return clean.trim();
};

/**
 * Recursively sanitizes string properties inside an object.
 */
export const sanitizeObjectInput = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObjectInput);
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObjectInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

/**
 * SSRF URL Validation
 * Checks if a URL targets local host, private subnets (RFC 1918), or cloud metadata endpoints.
 */
export const isSafeUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return false;
    }

    // Check IPv4 private ranges (10.x.x.x, 172.16.x.x - 172.31.x.x, 192.168.x.x)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      if (octet1 === 10) return false;
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      if (octet1 === 192 && octet2 === 168) return false;
      if (octet1 === 0 || octet1 === 127) return false;
    }

    return true;
  } catch {
    return false;
  }
};
