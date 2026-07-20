import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, of, tap } from "rxjs";

export interface ServiceEnquiryTimeline {
  status: string;
  label: string;
  timestamp: string;
  remarks?: string;
  updatedBy?: string;
  notificationSent?: boolean;
}

export interface ServiceQuotation {
  materialCost: number;
  printingCost: number;
  machineFee: number;
  laborFee: number;
  postProcessingFee: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  pdfUrl?: string;
  validUntil?: string;
  notes?: string;
}

export interface ServiceFile {
  id: string;
  enquiryId: string;
  trackingNumber: string;
  folder: "original" | "quotation" | "reference" | "production" | "qc" | "delivery";
  fileName: string;
  originalFileName: string;
  fileType: string;
  mimeType: string;
  fileSize: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  isLatest: boolean;
  downloadCount: number;
  lastDownloadedAt?: string;
}

export interface ServiceEnquiry {
  id: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  isGuest: boolean;

  modelName: string;
  fileSize: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  surfaceAreaCm2?: number;
  weightGrams: number;
  triangleCount?: number;
  estimatedHours: number;

  material: string;
  color: string;
  infillPercent: number;
  layerHeight: string;
  nozzleSize?: string;
  supportType?: string;
  buildPlateAdhesion?: string;
  printSpeed?: string;
  surfaceFinish?: string;
  quantity: number;
  notes?: string;

  status: string;
  assignedStaff?: string;
  expectedCompletionDate?: string;
  adminRemarks?: string;

  estimatedCost: number;
  quotation?: ServiceQuotation;

  timeline: ServiceEnquiryTimeline[];
  notifications: {
    id: string;
    type: "push" | "whatsapp" | "email";
    sentAt: string;
    title: string;
    body: string;
  }[];
  files?: ServiceFile[];
}

@Injectable({
  providedIn: "root",
})
export class ServiceEnquiryService {
  private http = inject(HttpClient);

  myEnquiries = signal<ServiceEnquiry[]>([]);
  adminEnquiries = signal<ServiceEnquiry[]>([]);
  adminStats = signal<any>(null);
  loading = signal<boolean>(false);

  submitEnquiry(payload: any): Observable<any> {
    return this.http.post<any>("/api/services/enquiry", payload).pipe(
      tap((res) => {
        if (res.data) {
          this.myEnquiries.update((list) => [res.data, ...list]);
        }
      })
    );
  }

  getMyEnquiries(email?: string, userId?: string): Observable<any> {
    this.loading.set(true);
    let url = `/api/services/my-enquiries?`;
    if (email) url += `email=${encodeURIComponent(email)}&`;
    if (userId) url += `userId=${encodeURIComponent(userId)}`;

    return this.http.get<any>(url).pipe(
      tap((res) => {
        if (res.data) {
          this.myEnquiries.set(res.data);
        }
        this.loading.set(false);
      }),
      catchError(() => {
        this.loading.set(false);
        return of({ success: false, data: [] });
      })
    );
  }

  trackRequest(query: string, auth?: string): Observable<any> {
    let url = `/api/services/tracking/${encodeURIComponent(query)}`;
    if (auth) url += `?auth=${encodeURIComponent(auth)}`;
    return this.http.get<any>(url);
  }

  getEnquiryById(id: string): Observable<any> {
    return this.http.get<any>(`/api/services/enquiry/${encodeURIComponent(id)}`);
  }

  customerAction(id: string, action: string, remarks?: string): Observable<any> {
    return this.http.put<any>(`/api/services/enquiry/${encodeURIComponent(id)}/action`, { action, remarks }).pipe(
      tap((res) => {
        if (res.data) {
          this.myEnquiries.update((list) =>
            list.map((item) => (item.id === id ? res.data : item))
          );
        }
      })
    );
  }

  // --- FILE MANAGEMENT METHODS ---
  uploadFile(payload: {
    trackingNumber: string;
    folder: string;
    fileName: string;
    fileSize: string;
    downloadUrl?: string;
    uploadedBy?: string;
    fileType?: string;
  }): Observable<any> {
    return this.http.post<any>("/api/services/upload", payload);
  }

  getFiles(trackingNumber: string): Observable<any> {
    return this.http.get<any>(`/api/services/files/${encodeURIComponent(trackingNumber)}`);
  }

  downloadFile(fileId: string, downloadedBy: string = "User"): Observable<any> {
    return this.http.post<any>("/api/services/file/download", { fileId, downloadedBy });
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`/api/services/file/${encodeURIComponent(fileId)}`);
  }

  // --- ADMIN METHODS ---
  getAdminEnquiries(status?: string, search?: string): Observable<any> {
    this.loading.set(true);
    let url = `/api/admin/services?`;
    if (status && status !== "all") url += `status=${encodeURIComponent(status)}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;

    return this.http.get<any>(url).pipe(
      tap((res) => {
        if (res.data) {
          this.adminEnquiries.set(res.data);
        }
        if (res.stats) {
          this.adminStats.set(res.stats);
        }
        this.loading.set(false);
      }),
      catchError(() => {
        this.loading.set(false);
        return of({ success: false, data: [], stats: null });
      })
    );
  }

  updateAdminEnquiry(id: string, data: any): Observable<any> {
    return this.http.put<any>(`/api/admin/services/${encodeURIComponent(id)}`, data).pipe(
      tap((res) => {
        if (res.data) {
          this.adminEnquiries.update((list) =>
            list.map((item) => (item.id === id ? res.data : item))
          );
        }
      })
    );
  }

  generateAdminQuote(payload: any): Observable<any> {
    return this.http.post<any>("/api/admin/services/quote", payload).pipe(
      tap((res) => {
        if (res.data) {
          this.adminEnquiries.update((list) =>
            list.map((item) => (item.id === res.data.id ? res.data : item))
          );
        }
      })
    );
  }

  deleteAdminEnquiry(id: string): Observable<any> {
    return this.http.delete<any>(`/api/admin/services/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        this.adminEnquiries.update((list) => list.filter((item) => item.id !== id));
      })
    );
  }
}
