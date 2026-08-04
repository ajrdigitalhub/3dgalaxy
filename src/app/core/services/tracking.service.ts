import { Injectable } from '@angular/core';

export interface CourierPartnerConfig {
  id: string;
  name: string;
  urlPattern: string;
  enabled: boolean;
  isCustom?: boolean;
  logoUrl?: string;
  sortOrder?: number;
}

export const DEFAULT_COURIER_PARTNERS: CourierPartnerConfig[] = [
  { id: 'delhivery', name: 'Delhivery', urlPattern: 'https://www.delhivery.com/track/package/{{trackingNumber}}', enabled: true, sortOrder: 1 },
  { id: 'bluedart', name: 'Blue Dart', urlPattern: 'https://www.bluedart.com/tracking?trackingNumber={{trackingNumber}}', enabled: true, sortOrder: 2 },
  { id: 'dtdc', name: 'DTDC', urlPattern: 'https://www.dtdc.in/tracking/tracking_results.asp?Ttype=awb_no&strCnno={{trackingNumber}}', enabled: true, sortOrder: 3 },
  { id: 'professional', name: 'Professional Couriers', urlPattern: 'https://www.tpcindia.com/Tracking2014.aspx?id={{trackingNumber}}', enabled: true, sortOrder: 4 },
  { id: 'indiapost', name: 'India Post', urlPattern: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentnumber={{trackingNumber}}', enabled: true, sortOrder: 5 },
  { id: 'xpressbees', name: 'XpressBees', urlPattern: 'https://www.xpressbees.com/track?awb={{trackingNumber}}', enabled: true, sortOrder: 6 },
  { id: 'ekart', name: 'Ekart Logistics', urlPattern: 'https://ekartlogistics.com/shipmenttrack/{{trackingNumber}}', enabled: true, sortOrder: 7 },
  { id: 'shadowfax', name: 'Shadowfax', urlPattern: 'https://www.shadowfax.in/track/{{trackingNumber}}', enabled: true, sortOrder: 8 },
  { id: 'ecomexpress', name: 'Ecom Express', urlPattern: 'https://ecomexpress.in/tracking/?awb_field={{trackingNumber}}', enabled: true, sortOrder: 9 },
  { id: 'dhl', name: 'DHL', urlPattern: 'https://www.dhl.com/in-en/home/tracking.html?tracking-id={{trackingNumber}}', enabled: true, sortOrder: 10 },
  { id: 'fedex', name: 'FedEx', urlPattern: 'https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}', enabled: true, sortOrder: 11 },
  { id: 'ups', name: 'UPS', urlPattern: 'https://www.ups.com/track?tracknum={{trackingNumber}}', enabled: true, sortOrder: 12 },
  { id: 'aramex', name: 'Aramex', urlPattern: 'https://www.aramex.com/express/track-results?q={{trackingNumber}}', enabled: true, sortOrder: 13 },
  { id: 'amazon', name: 'Amazon Shipping', urlPattern: 'https://track.amazon.in/tracking/{{trackingNumber}}', enabled: true, sortOrder: 14 },
  { id: 'shiprocket', name: 'Shiprocket', urlPattern: 'https://shiprocket.co/tracking/{{trackingNumber}}', enabled: true, sortOrder: 15 },
  { id: 'porter', name: 'Porter', urlPattern: 'https://porter.in/track/{{trackingNumber}}', enabled: true, sortOrder: 16 },
  { id: 'trackon', name: 'Trackon', urlPattern: 'https://trackon.in/tracking/{{trackingNumber}}', enabled: true, sortOrder: 17 },
  { id: 'stcourier', name: 'ST Courier', urlPattern: 'https://stcourier.com/track?tracking_id={{trackingNumber}}', enabled: true, sortOrder: 18 },
  { id: 'vrllogistics', name: 'VRL Logistics', urlPattern: 'https://www.vrllogistics.in/vrl_track.aspx?cnt={{trackingNumber}}', enabled: true, sortOrder: 19 },
  { id: 'gati', name: 'Gati', urlPattern: 'https://www.gati.com/track-docket/?docket_no={{trackingNumber}}', enabled: true, sortOrder: 20 },
  { id: 'others', name: 'Others', urlPattern: '{{trackingNumber}}', enabled: true, sortOrder: 99 }
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
          enabled: c.enabled !== undefined ? c.enabled : existing.enabled
        });
      } else {
        partnerMap.set(key, {
          id: key,
          name: c.name,
          urlPattern: c.urlPattern || '{{trackingNumber}}',
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
    if (!cleanNum) return '';

    if (customUrlPattern && customUrlPattern.trim()) {
      if (customUrlPattern.includes('{{trackingNumber}}')) {
        return customUrlPattern.replace(/\{\{trackingNumber\}\}/g, encodeURIComponent(cleanNum));
      }
      return customUrlPattern;
    }

    const couriers = this.getCourierList(customSettings);
    const found = couriers.find(
      c => c.name.toLowerCase() === (courierPartner || '').toLowerCase() || c.id.toLowerCase() === (courierPartner || '').toLowerCase()
    );

    if (found && found.urlPattern && found.urlPattern.includes('{{trackingNumber}}')) {
      return found.urlPattern.replace(/\{\{trackingNumber\}\}/g, encodeURIComponent(cleanNum));
    }

    if (cleanNum.startsWith('http://') || cleanNum.startsWith('https://')) {
      return cleanNum;
    }

    return found?.urlPattern
      ? found.urlPattern.replace(/\{\{trackingNumber\}\}/g, encodeURIComponent(cleanNum))
      : `https://www.google.com/search?q=${encodeURIComponent((courierPartner || '') + ' tracking ' + cleanNum)}`;
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
