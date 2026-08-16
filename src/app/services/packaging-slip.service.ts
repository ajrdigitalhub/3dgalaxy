import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastService } from '../shared/components/toast/toast.service';
import { LOGO_DATA_URL } from '../shared/constants/logo.constant';
import { formatWeight, getItemWeightGrams, calculatePackageSummary } from '../shared/utils/weight.utils';

@Injectable({
  providedIn: 'root',
})
export class PackagingSlipService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  /**
   * Downloads the Packaging Slip PDF for a specific Order ID or Order Object
   */
  downloadPackagingSlip(orderInput: any, orderNumber?: string) {
    // If orderInput is already an order object
    if (typeof orderInput === 'object' && orderInput !== null) {
      const ordNum = orderInput.orderNumber || orderInput.id || orderNumber || 'slip';
      const cleanNum = String(ordNum).replace(/^#/, '');
      const filename = `PackingSlip-${cleanNum}.pdf`;
      const payload = this.buildPayloadFromOrder(orderInput);
      const cleanId = String(orderInput.id || orderInput.orderNumber || '').replace(/^#/, '');
      const backendUrl = `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}/packaging-slip`;

      this.toast.info(`Generating Packaging Slip for #${cleanNum}...`);
      this.renderAndDownloadHtmlPdf(payload, filename, backendUrl);
      return;
    }

    // Otherwise orderInput is an order ID string (UUID or order number like #3DX0012)
    const rawId = String(orderInput || orderNumber || '').trim();
    const cleanId = rawId.replace(/^#/, '');
    const filename = `PackingSlip-${cleanId || 'slip'}.pdf`;
    const token = localStorage.getItem('token') || '';

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const fetchUrl = `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}`;
    const backendUrl = `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}/packaging-slip`;

    this.toast.info(`Generating Packaging Slip for ${rawId}...`);

    // Fetch order details to render exact client-side preview PDF
    this.http.get(fetchUrl, { headers }).subscribe({
      next: (res: any) => {
        const ord = res?.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : res;
        const payload = this.buildPayloadFromOrder(ord);
        this.renderAndDownloadHtmlPdf(payload, filename, backendUrl);
      },
      error: (err) => {
        console.warn('[PackagingSlipService] Fetch order failed, falling back to backend blob download:', err);
        this.downloadBackendBlob(backendUrl, filename, token);
      }
    });
  }

  /**
   * Previews the Packaging Slip PDF in a new browser tab
   */
  previewPackagingSlip(orderId: string) {
    const rawId = String(orderId || '').trim();
    const cleanId = rawId.replace(/^#/, '');
    const token = localStorage.getItem('token') || '';
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${environment.apiUrl}/orders/${encodeURIComponent(cleanId)}/packaging-slip`;

    this.http.get(url, { headers, responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const previewUrl = window.URL.createObjectURL(blob);
        window.open(previewUrl, '_blank');
      },
      error: (err) => {
        console.error('[PackagingSlipService] Preview failed:', err);
        if (token) {
          window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank');
        } else {
          this.toast.error('Failed to preview Packaging Slip');
        }
      },
    });
  }

  /**
   * Downloads a customized Packaging Slip PDF generated from the interactive editor payload
   */
  downloadCustomPackagingSlip(orderId: string, customPayload: any, orderNumber?: string) {
    const rawId = String(orderNumber || orderId || '').trim();
    const cleanId = rawId.replace(/^#/, '');
    const filename = `PackingSlip-${cleanId || 'slip'}.pdf`;
    const targetId = String(orderId || cleanId).replace(/^#/, '');
    const backendUrl = `${environment.apiUrl}/orders/${encodeURIComponent(targetId)}/packaging-slip`;

    this.toast.info(`Generating Packaging Slip PDF...`);
    this.renderAndDownloadHtmlPdf(customPayload, filename, backendUrl);
  }

  private loadHtml2Pdf(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  async renderAndDownloadHtmlPdf(payload: any, filename: string, backendFallbackUrl?: string) {
    try {
      const html2pdf = await this.loadHtml2Pdf();

      const modalEl = document.getElementById('printable-packing-slip-sheet');
      let targetEl: HTMLElement;
      let tempContainer: HTMLElement | null = null;

      if (modalEl) {
        targetEl = modalEl;
      } else {
        tempContainer = this.createHtmlTemplateElement(payload);
        document.body.appendChild(tempContainer);
        targetEl = tempContainer;
      }

      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(targetEl).save();

      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
      this.toast.success(`Packing Slip ${filename} downloaded successfully.`);
    } catch (e) {
      console.warn('[PackagingSlipService] Client HTML2PDF render failed, resorting to backend fallback:', e);
      if (backendFallbackUrl) {
        const token = localStorage.getItem('token') || '';
        this.downloadBackendBlob(backendFallbackUrl, filename, token, payload);
      }
    }
  }

  private downloadBackendBlob(url: string, filename: string, token: string, payload?: any) {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const request$ = payload
      ? this.http.post(url, payload, { headers, responseType: 'blob' })
      : this.http.get(url, { headers, responseType: 'blob' });

    request$.subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        this.toast.success(`Packing Slip ${filename} downloaded successfully.`);
      },
      error: (err) => {
        console.error('[PackagingSlipService] Backend download failed:', err);
        this.toast.error(`Failed to download Packing Slip: ${err.message || 'Server error'}`);
      }
    });
  }

  private buildPayloadFromOrder(ord: any): any {
    if (!ord) return {};
    const ordNum = ord.orderNumber || ord.id || '2026217234';
    const digitsOnly = String(ordNum).replace(/[^0-9]/g, '');

    let addr: any = ord.shippingAddress || {};
    if (typeof ord.shippingAddress === 'string') {
      try { addr = JSON.parse(ord.shippingAddress); } catch (e) {}
    }

    const shipmentObj = (ord.shipments && ord.shipments.length > 0) ? ord.shipments[0] : (typeof ord.shipment === 'object' ? ord.shipment : null);

    let items: any[] = [];
    if (ord.items && ord.items.length > 0) {
      items = ord.items.map((i: any) => {
        const qty = Number(i.quantity || 1);
        const price = Number(i.unitPrice || i.price || 0);
        let varText = i.variant?.name ? ` (${i.variant.name})` : '';
        let weightText = i.selectedWeightValue ? ` [${i.selectedWeightValue} ${i.selectedWeightUnit || 'kg'}]` : (i.weightInGrams ? ` [${formatWeight(i.weightInGrams)}]` : '');
        return {
          qty,
          sku: i.variant?.sku || i.product?.sku || i.sku || 'SKU-001',
          description: `${i.product?.name || i.name || i.description || 'Item'}${varText}${weightText}`,
          price,
          extPrice: Number(i.totalPrice || (price * qty)),
          weightInGrams: getItemWeightGrams(i)
        };
      });
    }

    const packageSummary = calculatePackageSummary(ord.items || []);
    const shippingCost = Number(ord.shippingAmount !== undefined && ord.shippingAmount !== null ? ord.shippingAmount : 0);
    let codCharge = 0;
    if (ord.codCharge !== undefined && ord.codCharge !== null && Number(ord.codCharge) > 0) {
      codCharge = Number(ord.codCharge);
    } else if (ord.paymentMethod === 'COD' || ord.paymentMethod === 'cash_on_delivery') {
      codCharge = 100;
    }
    const taxAmount = Number(ord.taxAmount || 0);
    const discountAmount = Number(ord.discountAmount || 0);

    const subTotal = items.reduce((sum, i) => sum + Number(i.extPrice || 0), 0);
    const calculatedGrand = Math.max(0, subTotal + shippingCost + codCharge + taxAmount - discountAmount);
    const grandTotal = ord.totalAmount && Number(ord.totalAmount) > 0 ? Number(ord.totalAmount) : calculatedGrand;

    return {
      easyId: `ESUS${digitsOnly || '2026217234'}`,
      orderNumber: `#${String(ordNum).replace(/^#/, '')}`,
      dateStr: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      trackingNumber: shipmentObj?.trackingNumber || 'LZ92738101',
      shipToName: addr.name || [ord.customer?.user?.firstName, ord.customer?.user?.lastName].filter(Boolean).join(' ') || ord.customerName || 'Valued Customer',
      shipToPhone: addr.phone || ord.customer?.phone || ord.customer?.user?.mobile || '',
      shipToStreet: [addr.addressLine1 || addr.street, addr.addressLine2, addr.landmark].filter(Boolean).join(', ') || '',
      shipToCityStateZip: [addr.city, addr.state, addr.postalCode || addr.pincode].filter(Boolean).join(', ') || '',
      shipToCountry: addr.country || 'India',
      email: addr.email || ord.customer?.user?.email || ord.customerEmail || '',
      returnAddress: '3D Galaxy Labs India\n123 Tech Park, Electronic City\nBangalore, KA 560100, India',
      currencySymbol: '₹',
      currencyCode: 'INR',
      showPricing: true,
      shippingCost,
      codCharge,
      taxAmount,
      discountAmount,
      grandTotal,
      items,
      notesFromSender: ord.notes ? `Note: "${ord.notes}"` : 'Thank you for your order with 3D Galaxy!',
      notesFromShipping: shipmentObj?.shippingNotes ? shipmentObj.shippingNotes : 'Thanks for ordering our famous boxes!',
    };
  }

  private createHtmlTemplateElement(p: any): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.style.width = '650px';
    div.style.backgroundColor = '#ffffff';

    const formatNum = (val: any) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const currSym = p.currencySymbol || '₹';
    const currCode = p.currencyCode || 'INR';

    const itemsHtml = (p.items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #000000;">
        <td style="padding: 8px; text-align: center; border-right: 1px solid #000000; font-weight: bold; vertical-align: top;">${item.qty || 1}</td>
        <td style="padding: 8px; font-family: monospace; border-right: 1px solid #000000; vertical-align: top; word-break: break-all; max-width: 110px; font-size: 11px;">${item.sku || ''}</td>
        <td style="padding: 8px; border-right: ${p.showPricing ? '1px solid #000000' : 'none'}; vertical-align: top; line-height: 1.2;">${item.description || ''}</td>
        ${p.showPricing ? `
          <td style="padding: 8px; text-align: right; border-right: 1px solid #000000; vertical-align: top;">${currSym}${formatNum(item.price)}</td>
          <td style="padding: 8px; text-align: right; vertical-align: top; font-weight: bold;">${currSym}${formatNum(item.extPrice)}</td>
        ` : ''}
      </tr>
    `).join('');

    const qtyTotal = (p.items || []).reduce((sum: number, i: any) => sum + Number(i.qty || 0), 0);
    const subTotal = (p.items || []).reduce((sum: number, i: any) => sum + Number(i.extPrice || 0), 0);
    const shippingCost = Number(p.shippingCost || 0);
    const codCharge = Number(p.codCharge || 0);
    const taxAmount = Number(p.taxAmount || 0);
    const discountAmount = Number(p.discountAmount || 0);
    const calculatedGrand = Math.max(0, subTotal + shippingCost + codCharge + taxAmount - discountAmount);
    const grandTotal = p.grandTotal !== undefined ? Number(p.grandTotal) : calculatedGrand;

    div.innerHTML = `
      <div style="background: #ffffff; color: #000000; padding: 32px; font-family: ui-sans-serif, system-ui, sans-serif; border: 1px solid #d4d4d8; min-height: 920px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
        
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1.5px solid #000000; margin-bottom: 16px;">
            <div>
              <span style="display: block; font-size: 11px; font-weight: bold; color: #52525b; letter-spacing: 0.05em; text-transform: uppercase;">EASYID</span>
              <h1 style="font-size: 24px; font-weight: 900; color: #000000; letter-spacing: -0.025em; margin-top: 2px; font-family: monospace; text-transform: uppercase; line-height: 1;">
                ${p.easyId || 'ESUS30012'}
              </h1>
            </div>
            <div style="display: flex; align-items: center; justify-content: flex-end;">
              <img src="${LOGO_DATA_URL}" alt="3D Galaxy Logo" style="height: 40px; width: auto; object-fit: contain;" />
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 16px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #000000; letter-spacing: -0.025em;">Packing Slip</h2>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; color: #000000; line-height: 1.4; margin-bottom: 20px;">
            <div>
              <div style="display: flex; margin-bottom: 8px; align-items: center;">
                <span style="font-weight: bold; width: 72px; flex-shrink: 0;">Date:</span>
                <span>${p.dateStr || ''}</span>
              </div>
              <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-weight: bold; width: 72px; flex-shrink: 0;">Ship To:</span>
                <div style="white-space: pre-line; color: #18181b;">
                  <div style="font-weight: bold;">${p.shipToName || ''}</div>
                  ${p.shipToPhone ? `<div style="color: #3f3f46; font-weight: 500;">Contact: ${p.shipToPhone}</div>` : ''}
                  <div>${p.shipToStreet || ''}</div>
                  <div>${p.shipToCityStateZip || ''}</div>
                  <div>${p.shipToCountry || ''}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; margin-top: 4px;">
                <span style="font-weight: bold; width: 72px; flex-shrink: 0;">Email:</span>
                <span style="word-break: break-all; font-weight: 500; color: #27272a;">${p.email || ''}</span>
              </div>
            </div>

            <div>
              <div style="display: flex; margin-bottom: 8px; align-items: center;">
                <span style="font-weight: bold; width: 88px; flex-shrink: 0;">Tracking:</span>
                <span style="font-family: monospace;">${p.trackingNumber || ''}</span>
              </div>
              <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-weight: bold; width: 88px; flex-shrink: 0; line-height: 1.2;">Return<br/>Address:</span>
                <div style="white-space: pre-line; color: #27272a;">
                  ${p.returnAddress || ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; margin-top: 4px;">
                <span style="font-weight: bold; width: 88px; flex-shrink: 0;">Order:</span>
                <span style="font-weight: bold; font-family: monospace;">#${String(p.orderNumber || '').replace('#', '')}</span>
              </div>
            </div>
          </div>

          <div style="padding-top: 4px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; font-size: 12px; color: #000000;">
              <thead>
                <tr style="border-bottom: 1.5px solid #000000; background-color: #f4f4f5;">
                  <th style="padding: 6px 8px; text-align: center; font-weight: bold; width: 48px; border-right: 1px solid #000000;">Qty</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: bold; width: 112px; border-right: 1px solid #000000;">SKU</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: bold; border-right: ${p.showPricing ? '1px solid #000000' : 'none'};">Description</th>
                  ${p.showPricing ? `
                    <th style="padding: 6px 8px; text-align: right; font-weight: bold; width: 96px; border-right: 1px solid #000000;">Price</th>
                    <th style="padding: 6px 8px; text-align: right; font-weight: bold; width: 96px;">Ext. Price</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="padding-top: 12px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
              <div>
                <span style="font-weight: bold;">Qty Total: ${qtyTotal}</span>
              </div>
              ${p.showPricing ? `
                <div style="text-align: right; width: 256px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Sub Total</span>
                    <span style="font-weight: bold;">${currCode} ${formatNum(subTotal)}</span>
                  </div>
                  ${shippingCost > 0 || (codCharge === 0 && taxAmount === 0 && discountAmount === 0) ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>Shipping Cost</span>
                      <span style="font-weight: bold;">${currCode} ${formatNum(shippingCost)}</span>
                    </div>
                  ` : ''}
                  ${codCharge > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #b45309;">
                      <span>COD Handling Charge</span>
                      <span style="font-weight: bold;">${currCode} ${formatNum(codCharge)}</span>
                    </div>
                  ` : ''}
                  ${taxAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>Tax</span>
                      <span style="font-weight: bold;">${currCode} ${formatNum(taxAmount)}</span>
                    </div>
                  ` : ''}
                  ${discountAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #15803d;">
                      <span>Discount</span>
                      <span style="font-weight: bold;">-${currCode} ${formatNum(discountAmount)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px;">
                    <span>Total</span>
                    <span>${currCode} ${formatNum(grandTotal)}</span>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 16px;">
          <div style="border-bottom: 1.5px solid #000000; width: 100%; margin-bottom: 12px;"></div>

          ${p.notesFromSender ? `
            <div style="display: flex; gap: 24px; font-size: 12px; color: #000; margin-bottom: 10px;">
              <span style="font-weight: bold; width: 128px; flex-shrink: 0; line-height: 1.2;">Notes from the<br/>Sender:</span>
              <div style="white-space: pre-line; flex: 1; line-height: 1.4;">${p.notesFromSender}</div>
            </div>
          ` : ''}

          ${p.notesFromSender && p.notesFromShipping ? `
            <div style="border-bottom: 1px dotted #71717a; width: 100%; margin-bottom: 10px;"></div>
          ` : ''}

          ${p.notesFromShipping ? `
            <div style="display: flex; gap: 24px; font-size: 12px; color: #000;">
              <span style="font-weight: bold; width: 128px; flex-shrink: 0; line-height: 1.2;">Notes from<br/>LisShipment:</span>
              <div style="white-space: pre-line; flex: 1; line-height: 1.4;">${p.notesFromShipping}</div>
            </div>
          ` : ''}
        </div>

      </div>
    `;
    return div;
  }
}
