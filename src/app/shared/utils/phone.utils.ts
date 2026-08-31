/**
 * Utility function to sanitize and format phone numbers for WhatsApp API/Redirection URLs (wa.me).
 * Ensures country code (default 91 for India) is always prepended if a 10-digit number is provided.
 */
export function formatWhatsAppNumber(
  phone: string | number | undefined | null,
  defaultFallback: string = '919876543210'
): string {
  let clean = String(phone || '').replace(/[^0-9]/g, '');
  
  if (!clean) {
    clean = String(defaultFallback).replace(/[^0-9]/g, '');
  }

  // 10-digit Indian mobile number: prepend 91
  if (clean.length === 10) {
    clean = '91' + clean;
  } 
  // 11-digit mobile number with leading 0 (e.g., 08903035099): strip 0 and prepend 91
  else if (clean.length === 11 && clean.startsWith('0')) {
    clean = '91' + clean.slice(1);
  }

  return clean;
}

/**
 * Builds a clean wa.me URL ensuring proper country code and encoded text message.
 */
export function buildWhatsAppUrl(
  phone: string | number | undefined | null,
  message: string = '',
  defaultFallback: string = '919876543210'
): string {
  const cleanPhone = formatWhatsAppNumber(phone, defaultFallback);
  const encodedMsg = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone}${encodedMsg ? '?text=' + encodedMsg : ''}`;
}
