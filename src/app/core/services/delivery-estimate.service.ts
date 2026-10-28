import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeliveryEstimateService {
  private MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Validates format: accepts single digits or hyphenated ranges. Rejecting others.
  public isValidFormat(estimateStr: string | null | undefined): boolean {
    if (!estimateStr) return false;
    const clean = String(estimateStr).trim();
    if (/^\d+$/.test(clean)) return true;
    if (/^\d+\s*-\s*\d+$/.test(clean)) {
      const parts = clean.split('-').map(p => parseInt(p.trim(), 10));
      return parts[0] < parts[1]; // min must be less than max
    }
    return false;
  }

  // Parse string configuration (e.g. "3-4" or "3" or "5-7" or "304") into encoded number (e.g. 304 or 507)
  public parseEstimateDays(estimateStr: string | number | null | undefined): number {
    if (estimateStr === null || estimateStr === undefined || estimateStr === '') return 304; // Default 3-4 days transit
    if (typeof estimateStr === 'number') {
      if (isNaN(estimateStr) || estimateStr <= 0) return 304;
      if (estimateStr >= 100) return estimateStr;
      if (estimateStr < 10) return estimateStr * 100 + (estimateStr + 1); // e.g. 3 -> 304 (3-4 days), 4 -> 405 (4-5 days)
      return estimateStr;
    }
    const clean = String(estimateStr).trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      const min = parseInt(parts[0].trim(), 10);
      const max = parseInt(parts[1].trim(), 10);
      if (!isNaN(min) && !isNaN(max) && min < max) {
        return min * 100 + max;
      }
    }
    if (clean.toLowerCase().includes('to')) {
      const parts = clean.toLowerCase().split('to');
      const min = parseInt(parts[0].trim(), 10);
      const max = parseInt(parts[1].trim(), 10);
      if (!isNaN(min) && !isNaN(max) && min < max) {
        return min * 100 + max;
      }
    }
    const val = parseInt(clean, 10);
    if (isNaN(val) || val <= 0) return 304;
    if (val >= 100) return val;
    if (val < 10) return val * 100 + (val + 1);
    return val;
  }

  // Decodes an encoded number back to human-readable days string like "3-4" or "3"
  public decodeDays(encoded: number | null | undefined): string {
    if (encoded === undefined || encoded === null || isNaN(encoded)) return '3-4';
    if (encoded >= 100) {
      const min = Math.floor(encoded / 100);
      const max = encoded % 100;
      return `${min}-${max}`;
    }
    return String(encoded);
  }

  // Calculate actual min/max Date objects: Next-day dispatch (+1 day) + extra transit days (minDays to maxDays)
  public calculateDeliveryDates(
    encodedDays: number | string,
    baseDate: Date = this.getISTDate(),
    hasDispatched: boolean = false
  ): { minDate: Date; maxDate: Date; minDays: number; maxDays: number } {
    const encoded = typeof encodedDays === 'number' ? encodedDays : this.parseEstimateDays(encodedDays);
    let minDays = 3;
    let maxDays = 4;

    if (encoded >= 100) {
      minDays = Math.floor(encoded / 100);
      maxDays = encoded % 100;
    } else if (encoded > 0 && encoded < 100) {
      minDays = encoded;
      maxDays = encoded + 1;
    }

    // Dispatch is next day (+1 day) from purchase date if not already dispatched
    const dispatchOffset = hasDispatched ? 0 : 1;

    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() + dispatchOffset + minDays);

    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + dispatchOffset + maxDays);

    return { minDate, maxDate, minDays, maxDays };
  }

  // Formats date as 'DD MMM YYYY' or 'DD MMM'
  private formatDate(date: Date, showYear: boolean = true): string {
    const day = date.getDate();
    const month = this.MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return showYear ? `${day} ${month} ${year}` : `${day} ${month}`;
  }

  // Format dynamic delivery ranges
  public formatDeliveryRange(
    encodedDays: number | string,
    desktopFormat: boolean = true,
    baseDate: Date = this.getISTDate(),
    hasDispatched: boolean = false
  ): string {
    if (typeof encodedDays === 'string') {
      const clean = encodedDays.trim();
      // If already a formatted range like "01 Nov 2026 – 02 Nov 2026" or "1 Nov 2026 – 2 Nov 2026"
      if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(clean) && (clean.includes('–') || clean.includes('-'))) {
        return clean.replace(/^Expected by\s+/i, '').trim();
      }
    }

    const encoded = typeof encodedDays === 'number' ? encodedDays : this.parseEstimateDays(encodedDays);
    const { minDate, maxDate } = this.calculateDeliveryDates(encoded, baseDate, hasDispatched);
    
    const minDayStr = minDate.getDate();
    const maxDayStr = maxDate.getDate();
    const minMonthStr = this.MONTHS[minDate.getMonth()];
    const maxMonthStr = this.MONTHS[maxDate.getMonth()];
    const minYearStr = minDate.getFullYear();
    const maxYearStr = maxDate.getFullYear();

    if (minDate.getTime() === maxDate.getTime() || (minDayStr === maxDayStr && minMonthStr === maxMonthStr && minYearStr === maxYearStr)) {
      // Single Date
      return this.formatDate(minDate, desktopFormat);
    }

    // Range
    if (desktopFormat) {
      // "1 Nov 2026 – 2 Nov 2026"
      return `${this.formatDate(minDate, true)} – ${this.formatDate(maxDate, true)}`;
    } else {
      // Mobile: compact formatting: e.g. "1–2 Nov" or "31 Oct–2 Nov"
      if (minMonthStr === maxMonthStr && minYearStr === maxYearStr) {
        return `${minDayStr}–${maxDayStr} ${minMonthStr}`;
      } else {
        return `${minDayStr} ${minMonthStr}–${maxDayStr} ${maxMonthStr}`;
      }
    }
  }

  // Live preview formatting helper
  public getDeliveryPreview(estimateStr: string, baseDate?: Date): string {
    if (!this.isValidFormat(estimateStr)) {
      return '';
    }
    const encoded = this.parseEstimateDays(estimateStr);
    return this.formatDeliveryRange(encoded, true, baseDate);
  }

  // Centralized timezone-locked base date provider (IST Asia/Kolkata)
  public getISTDate(): Date {
    const now = new Date();
    // UTC time
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    // IST offset is UTC+5:30
    const istOffset = 5.5 * 3600000;
    return new Date(utcTime + istOffset);
  }
}
