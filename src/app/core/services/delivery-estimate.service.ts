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

  // Parse string configuration (e.g. "5-6" or "5") into encoded number (e.g. 506 or 5)
  public parseEstimateDays(estimateStr: string | null | undefined): number {
    if (!estimateStr) return 3; // Default fallback
    const clean = String(estimateStr).replace(/\s+/g, '');
    if (clean.includes('-')) {
      const parts = clean.split('-');
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max) && min < max) {
        return min * 100 + max;
      }
    }
    const val = parseInt(clean, 10);
    return isNaN(val) ? 3 : val;
  }

  // Decodes an encoded number back to human-readable days string like "5-6" or "5"
  public decodeDays(encoded: number | null | undefined): string {
    if (encoded === undefined || encoded === null || isNaN(encoded)) return '3';
    if (encoded >= 100) {
      const min = Math.floor(encoded / 100);
      const max = encoded % 100;
      return `${min}-${max}`;
    }
    return String(encoded);
  }

  // Calculate actual min/max Date objects in client but timezone-adjusted to Asia/Kolkata
  public calculateDeliveryDates(encodedDays: number, baseDate: Date = this.getISTDate()): { minDate: Date; maxDate: Date } {
    let minDays = encodedDays;
    let maxDays = encodedDays;

    if (encodedDays >= 100) {
      minDays = Math.floor(encodedDays / 100);
      maxDays = encodedDays % 105; // To prevent modulo side effects, just decode normally
      maxDays = encodedDays % 100;
    }

    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + maxDays);

    return { minDate, maxDate };
  }

  // Formats date as 'DD MMM YYYY' or 'DD MMM'
  private formatDate(date: Date, showYear: boolean = true): string {
    const day = date.getDate();
    const month = this.MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return showYear ? `${day} ${month} ${year}` : `${day} ${month}`;
  }

  // Format dynamic delivery ranges
  public formatDeliveryRange(encodedDays: number | string, desktopFormat: boolean = true, baseDate: Date = this.getISTDate()): string {
    const encoded = typeof encodedDays === 'string' ? this.parseEstimateDays(encodedDays) : (Number(encodedDays) || 3);
    const { minDate, maxDate } = this.calculateDeliveryDates(encoded, baseDate);
    
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
      // "10 Aug 2026 – 11 Aug 2026"
      return `${this.formatDate(minDate, true)} – ${this.formatDate(maxDate, true)}`;
    } else {
      // Mobile: compact formatting: e.g. "10–11 Aug" or "30 Aug–02 Sep" or "10 Aug–11 Sep"
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
