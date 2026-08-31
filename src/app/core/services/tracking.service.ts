import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CourierPartnerConfig {
  id: string;
  name: string;
  urlPattern: string;
  baseUrl?: string;
  enabled: boolean;
  isCustom?: boolean;
  logoUrl?: string;
  sortOrder?: number;
}

export const DEFAULT_COURIER_PARTNERS: CourierPartnerConfig[] = [
  {
    id: 'delhivery',
    name: 'Delhivery Courier',
    urlPattern: 'https://www.delhivery.com/tracking?trackingNumber={{trackingNumber}}',
    baseUrl: 'https://www.delhivery.com/tracking',
    enabled: true,
    sortOrder: 1
  },
  {
    id: 'anjani',
    name: 'Anjani Courier',
    urlPattern: 'https://shreeanjani.co.in/tracking?awb={{trackingNumber}}',
    baseUrl: 'https://shreeanjani.co.in/tracking',
    enabled: true,
    sortOrder: 2
  },
  {
    id: 'bluedart',
    name: 'Bluedart',
    urlPattern: 'https://www.bluedart.com/how-to-track?trackingNumber={{trackingNumber}}',
    baseUrl: 'https://www.bluedart.com/how-to-track',
    enabled: true,
    sortOrder: 3
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    urlPattern: 'https://www.dtdc.com/track-your-shipment/?strCnno={{trackingNumber}}',
    baseUrl: 'https://www.dtdc.com/track-your-shipment/',
    enabled: true,
    sortOrder: 4
  },
  {
    id: 'maruti',
    name: 'Maruti Courier',
    urlPattern: 'https://shreemaruti.com/track-shipment/?awb={{trackingNumber}}',
    baseUrl: 'https://shreemaruti.com/track-shipment/',
    enabled: true,
    sortOrder: 5
  },
  {
    id: 'indiapost',
    name: 'Indian Post',
    urlPattern: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentnumber={{trackingNumber}}',
    baseUrl: 'https://www.indiapost.gov.in/',
    enabled: true,
    sortOrder: 6
  },
  {
    id: 'others',
    name: 'Others',
    urlPattern: '{{trackingNumber}}',
    baseUrl: '',
    enabled: true,
    sortOrder: 7
  }
];

@Injectable({
  providedIn: 'root'
})
export class TrackingService {

  getCourierList(customSettings?: any[]): CourierPartnerConfig[] {
    if (!customSettings || !Array.isArray(customSettings) || customSettings.length === 0) {
      return DEFAULT_COURIER_PARTNERS;
    }

    const partnerMap = new Map<string, CourierPartnerConfig>();
    DEFAULT_COURIER_PARTNERS.forEach(p => partnerMap.set(p.id.toLowerCase(), { ...p }));

    customSettings.forEach(c => {
      const key = c.id ? c.id.toLowerCase() : c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = partnerMap.get(key);
      if (existing) {
        partnerMap.set(key, {
          ...existing,
          ...c,
          name: c.name || existing.name,
          urlPattern: c.urlPattern || existing.urlPattern,
          baseUrl: c.baseUrl || existing.baseUrl,
          enabled: c.enabled !== undefined ? c.enabled : existing.enabled
        });
      } else {
        partnerMap.set(key, {
          id: key,
          name: c.name,
          urlPattern: c.urlPattern || '{{trackingNumber}}',
          baseUrl: c.baseUrl || '',
          enabled: c.enabled !== undefined ? c.enabled : true,
          isCustom: true,
          logoUrl: c.logoUrl,
          sortOrder: c.sortOrder || 50
        });
      }
    });

    return Array.from(partnerMap.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  generateTrackingUrl(
    courierPartner: string,
    trackingNumber: string,
    customUrlPattern?: string,
    customSettings?: any[]
  ): string {
    const cleanNum = (trackingNumber || '').trim();

    if (customUrlPattern && customUrlPattern.trim()) {
      if (customUrlPattern.includes('{{trackingNumber}}')) {
        return cleanNum ? customUrlPattern.replace(/\{\{trackingNumber\}\}/g, encodeURIComponent(cleanNum)) : customUrlPattern.replace(/(\?|\&).*$/, '');
      }
      return customUrlPattern;
    }

    const couriers = this.getCourierList(customSettings);
    const normKey = (courierPartner || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    const found = couriers.find(c => {
      const cId = c.id.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const cName = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return cId === normKey || cName === normKey || cId.includes(normKey) || normKey.includes(cId);
    });

    if (found) {
      if (cleanNum) {
        if (found.urlPattern && found.urlPattern.includes('{{trackingNumber}}')) {
          return found.urlPattern.replace(/\{\{trackingNumber\}\}/g, encodeURIComponent(cleanNum));
        }
      }
      if (found.baseUrl) {
        return found.baseUrl;
      }
    }

    if (cleanNum.startsWith('http://') || cleanNum.startsWith('https://')) {
      return cleanNum;
    }

    return cleanNum
      ? `https://www.google.com/search?q=${encodeURIComponent((courierPartner || '') + ' tracking ' + cleanNum)}`
      : `${environment.siteUrl}/order-tracking`;
  }

  decodeDays(val: number | string | null | undefined): string {
    if (val === undefined || val === null || val === '') return '3';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 100) {
      const min = Math.floor(num / 100);
      const max = num % 100;
      return `${min}-${max}`;
    }
    return String(num);
  }

  calculateEstimatedDelivery(
    items: Array<{ product?: any; estimatedDeliveryDays?: any; quantity?: number }>,
    shipmentDateInput?: Date | string
  ): { formattedRange: string; startDate: Date; endDate: Date; minDays: number; maxDays: number } {
    const baseDate = shipmentDateInput ? new Date(shipmentDateInput) : new Date();

    let maxMinDays = 3;
    let maxMaxDays = 5;

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const prod = item.product || item;
        const encodedDays = prod.estimatedDeliveryDays ?? prod.category?.estimatedDeliveryDays ?? 3;
        const decoded = this.decodeDays(encodedDays);
        
        let minDays = 3;
        let maxDays = 5;

        if (decoded.includes('-')) {
          const parts = decoded.split('-').map(p => parseInt(p, 10));
          if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            minDays = parts[0];
            maxDays = parts[1];
          }
        } else {
          const val = parseInt(decoded, 10);
          if (!isNaN(val)) {
            minDays = val;
            maxDays = val + 2;
          }
        }

        if (minDays > maxMinDays) maxMinDays = minDays;
        if (maxDays > maxMaxDays) maxMaxDays = maxDays;
      }
    }

    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + maxMinDays);

    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + maxMaxDays);

    const formatDate = (d: Date): string => {
      const day = d.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const formattedRange = `${formatDate(startDate)} – ${formatDate(endDate)}`;

    return {
      formattedRange,
      startDate,
      endDate,
      minDays: maxMinDays,
      maxDays: maxMaxDays
    };
  }
}
