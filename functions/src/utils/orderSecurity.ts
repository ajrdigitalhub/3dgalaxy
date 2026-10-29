import crypto from 'crypto';

const ORDER_SECURITY_SECRET = process.env.ORDER_SECURITY_SECRET || process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_order_sec_key_2026';

/**
 * Generate a deterministic secure token for an order.
 * This token grants secure access to view the specific order without requiring login.
 */
export function generateOrderAccessToken(order: { id: string; orderNumber?: string | null; customerId?: string | null }): string {
  if (!order || !order.id) return '';
  const seed = `${order.id}:${order.orderNumber || ''}:${order.customerId || ''}`;
  return crypto.createHmac('sha256', ORDER_SECURITY_SECRET).update(seed).digest('hex').substring(0, 32);
}

/**
 * Verifies if a given token matches the expected token for the order.
 */
export function verifyOrderAccessToken(token: string | undefined | null, order: { id: string; orderNumber?: string | null; customerId?: string | null }): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim().toLowerCase();
  const expected = generateOrderAccessToken(order).toLowerCase();
  if (!expected || cleanToken.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Extracts all valid email addresses associated with an order.
 */
export function getOrderAuthorizedEmails(order: any): string[] {
  const emails = new Set<string>();

  const addEmail = (val: any) => {
    if (typeof val === 'string' && val.includes('@')) {
      const clean = val.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        emails.add(clean);
      }
    }
  };

  if (order?.customer?.user?.email) addEmail(order.customer.user.email);
  if (order?.customer?.email) addEmail(order.customer.email);
  if (order?.guestEmail) addEmail(order.guestEmail);

  // Check shippingAddress object or string
  let ship = order?.shippingAddress;
  if (typeof ship === 'string') {
    try { ship = JSON.parse(ship); } catch {}
  }
  if (ship && typeof ship === 'object') {
    if (ship.email) addEmail(ship.email);
  }

  // Check billingAddress
  let bill = order?.billingAddress;
  if (typeof bill === 'string') {
    try { bill = JSON.parse(bill); } catch {}
  }
  if (bill && typeof bill === 'object') {
    if (bill.email) addEmail(bill.email);
  }

  // Check shipment JSON
  let shipment = order?.shipment;
  if (typeof shipment === 'string') {
    try { shipment = JSON.parse(shipment); } catch {}
  }
  if (shipment && typeof shipment === 'object') {
    if (shipment.customerEmail) addEmail(shipment.customerEmail);
    if (shipment.recipient?.email) addEmail(shipment.recipient.email);
    if (shipment.email) addEmail(shipment.email);
  }

  return Array.from(emails);
}

/**
 * Checks if a provided email matches any authorized email for the order.
 */
export function verifyOrderEmail(providedEmail: string | undefined | null, order: any): boolean {
  if (!providedEmail || typeof providedEmail !== 'string') return false;
  const cleanProvided = providedEmail.trim().toLowerCase();
  const authorized = getOrderAuthorizedEmails(order);
  return authorized.includes(cleanProvided);
}

