import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastService } from '../shared/components/toast/toast.service';

@Injectable({
  providedIn: 'root',
})
export class PackagingSlipService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  /**
   * Downloads the Packaging Slip PDF for a specific Order ID
   */
  downloadPackagingSlip(orderId: string, orderNumber?: string) {
    const filename = `PackagingSlip-${orderNumber || orderId}.pdf`;
    const token = localStorage.getItem('token') || '';

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${environment.apiUrl}/orders/${orderId}/packaging-slip`;

    this.toast.info(`Generating Packaging Slip for ${orderNumber || orderId}...`);

    this.http.get(url, { headers, responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        this.toast.success(`Packaging Slip ${filename} downloaded successfully.`);
      },
      error: (err) => {
        console.error('[PackagingSlipService] Download failed:', err);
        // Fallback: direct window download via query token
        if (token) {
          const fallbackUrl = `${url}?token=${encodeURIComponent(token)}`;
          window.open(fallbackUrl, '_blank');
          this.toast.success(`Initiated direct Packaging Slip download.`);
        } else {
          this.toast.error(`Failed to download Packaging Slip: ${err.message || 'Unauthorized or server error'}`);
        }
      },
    });
  }

  /**
   * Previews the Packaging Slip PDF in a new browser tab
   */
  previewPackagingSlip(orderId: string) {
    const token = localStorage.getItem('token') || '';
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${environment.apiUrl}/orders/${orderId}/packaging-slip`;

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
    const filename = `PackingSlip-${orderNumber || orderId}.pdf`;
    const token = localStorage.getItem('token') || '';

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const url = `${environment.apiUrl}/orders/${orderId}/packaging-slip`;

    this.toast.info(`Generating Packing Slip PDF...`);

    this.http.post(url, customPayload, { headers, responseType: 'blob' }).subscribe({
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
        console.error('[PackagingSlipService] Custom download failed:', err);
        this.toast.error(`Failed to download Packing Slip: ${err.message || 'Server error'}`);
      },
    });
  }
}
