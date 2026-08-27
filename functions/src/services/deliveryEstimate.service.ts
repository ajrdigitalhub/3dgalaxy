import prisma from '../config/database';
import { ShippingService } from './shipping.service';

export class DeliveryEstimateService {
  private static readonly MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /**
   * Convert date to IST timezone (UTC+5:30)
   */
  public static toIST(date: Date = new Date()): Date {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (5.5 * 3600000));
  }

  /**
   * Format Date instance into "D MMM YYYY" (e.g., "10 Aug 2026")
   */
  public static formatDate(date: Date): string {
    const ist = this.toIST(date);
    const d = ist.getDate();
    const m = this.MONTH_NAMES[ist.getMonth()];
    const y = ist.getFullYear();
    return `${d} ${m} ${y}`;
  }

  /**
   * Add N calendar days to a base date (handles month/year rollover)
   */
  public static addDays(baseDate: Date, days: number): Date {
    const result = new Date(baseDate);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Parse delivery days input into [minDays, maxDays]
   * Supports:
   * - 3-digit encoded numbers: 305 -> [3, 5], 506 -> [5, 6]
   * - 2-digit encoded numbers: 35 -> [3, 5], 56 -> [5, 6]
   * - Range strings: "3-5", "3 to 5", "5 – 6"
   * - Single numbers/strings: 4 -> [4, 4]
   */
  public static parseDeliveryDays(daysInput?: number | string | null): [number, number] {
    if (daysInput === null || daysInput === undefined || daysInput === '') {
      return [3, 5]; // Default fallback range 3-5 days
    }

    if (typeof daysInput === 'number') {
      if (isNaN(daysInput) || daysInput <= 0) return [3, 5];
      
      // 3-digit encoding (e.g. 305 = 3 to 5 days, 506 = 5 to 6 days, 710 = 7 to 10 days)
      if (daysInput >= 100) {
        const min = Math.floor(daysInput / 100);
        const max = daysInput % 100;
        if (min > 0 && max >= min) return [min, max];
      }
      
      // 2-digit encoding (e.g. 35 = 3 to 5 days, 56 = 5 to 6 days)
      if (daysInput >= 10 && daysInput < 100) {
        const min = Math.floor(daysInput / 10);
        const max = daysInput % 10;
        if (min > 0 && max >= min) return [min, max];
      }
      
      return [daysInput, daysInput];
    }

    const str = String(daysInput).trim();
    
    // Match range patterns like "5-6", "3 to 5", "5 – 6"
    const match = str.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/i);
    if (match) {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) {
        return [min, max];
      }
    }

    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      if (num >= 100) {
        const min = Math.floor(num / 100);
        const max = num % 100;
        if (min > 0 && max >= min) return [min, max];
      }
      if (num >= 10 && num < 100) {
        const min = Math.floor(num / 10);
        const max = num % 10;
        if (min > 0 && max >= min) return [min, max];
      }
      if (num > 0) return [num, num];
    }

    return [3, 5];
  }

  /**
   * Dynamically calculate estimated delivery date string e.g. "10 Aug 2026" or "10 Aug 2026 – 12 Aug 2026"
   */
  public static calculateEstimateDate(
    daysInput?: number | string | null,
    baseDate: Date = new Date()
  ): string {
    const [minDays, maxDays] = this.parseDeliveryDays(daysInput);

    const minDate = this.addDays(baseDate, minDays);
    const maxDate = this.addDays(baseDate, maxDays);

    const minFormatted = this.formatDate(minDate);
    const maxFormatted = this.formatDate(maxDate);

    if (minDays === maxDays || minFormatted === maxFormatted) {
      return minFormatted;
    }

    return `${minFormatted} – ${maxFormatted}`;
  }

  /**
   * Resolve aggregate estimated delivery date string for an entire order by inspecting order items & products
   */
  public static async calculateOrderDeliveryEstimate(
    order: any,
    baseDate?: Date
  ): Promise<string> {
    const resolvedBaseDate: Date = baseDate 
      ? new Date(baseDate) 
      : (order?.createdAt ? new Date(order.createdAt) : new Date());

    // 1. Return order.estimatedDelivery if explicitly set as formatted date or string range
    if (order?.estimatedDelivery && typeof order.estimatedDelivery === 'string' && order.estimatedDelivery.length >= 6) {
      const parsed = new Date(order.estimatedDelivery);
      if (!isNaN(parsed.getTime())) {
        return this.formatDate(parsed);
      }
      return order.estimatedDelivery;
    }

    // 2. Query products/items for maximum estimated delivery days
    let minDaysMax = 3;
    let maxDaysMax = 5;
    const items = order?.items || [];

    if (items.length > 0) {
      try {
        const itemRequests = items.map((i: any) => ({
          productId: i.productId || i.product?.id,
          variantId: i.variantId || i.variant?.id,
          quantity: i.quantity || 1
        })).filter((i: any) => !!i.productId);

        if (itemRequests.length > 0) {
          const calcResult = await ShippingService.calculateShipping(itemRequests);
          if (calcResult?.estimatedDays) {
            const [pMin, pMax] = this.parseDeliveryDays(calcResult.estimatedDays);
            minDaysMax = pMin;
            maxDaysMax = pMax;
          }
        } else {
          // Direct item examination
          for (const item of items) {
            const daysRaw = item.product?.estimatedDeliveryDays || item.estimatedDeliveryDays;
            if (daysRaw) {
              const [iMin, iMax] = this.parseDeliveryDays(daysRaw);
              if (iMin > minDaysMax) minDaysMax = iMin;
              if (iMax > maxDaysMax) maxDaysMax = iMax;
            }
          }
        }
      } catch (err) {
        console.warn('[DeliveryEstimateService] Failed to calculate shipping estimate, using defaults:', err);
      }
    }

    const minDate = this.addDays(resolvedBaseDate, minDaysMax);
    const maxDate = this.addDays(resolvedBaseDate, maxDaysMax);
    const minFormatted = this.formatDate(minDate);
    const maxFormatted = this.formatDate(maxDate);

    if (minDaysMax === maxDaysMax || minFormatted === maxFormatted) {
      return minFormatted;
    }

    return `${minFormatted} – ${maxFormatted}`;
  }
}

