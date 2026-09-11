import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../services/api.service';
import { Observable, timer, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export interface BackupRecord {
  id: string;
  backupName: string;
  storagePath: string;
  fileSize: number;
  checksum: string;
  tableCount: number;
  backupType: 'MANUAL' | 'SCHEDULED' | 'PRE_RESTORE';
  status: 'QUEUED' | 'RUNNING' | 'UPLOADING' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'RESTORING' | 'RESTORE_FAILED';
  durationMs: number;
  manifest?: any;
  verification?: any;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupConfig {
  backupModuleEnabled: boolean;
  autoBackupEnabled: boolean;
  scheduleType: string;
  cronExpression: string;
  scheduleDescription: string;
  backupTime: string;
  backupDays: string;
  timezone: string;
  retentionCount: number;
  storageRoot: string;
  isOverdue: boolean;
  overdueDays: number;
  totalBackups: number;
  totalSizeBytes: number;
  lastSuccessfulBackup: BackupRecord | null;
  isBusy: boolean;
  activeJob: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  // Reactive State Signals
  public backupModuleEnabled = signal<boolean>(true); // default true, resolved via server config
  public config = signal<BackupConfig | null>(null);
  public history = signal<BackupRecord[]>([]);
  public totalCount = signal<number>(0);
  public totalSizeBytes = signal<number>(0);
  public lastSuccessfulBackup = signal<BackupRecord | null>(null);
  public isOverdue = signal<boolean>(false);
  public overdueDays = signal<number>(0);
  public activeJob = signal<any | null>(null);
  public isBusy = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  private pollSubscription: Subscription | null = null;

  constructor() {
    this.checkInitialModuleStatus();
  }

  private getApiUrl(path: string): string {
    const base = this.baseUrl.replace(/\/api\/?$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${base}/api${cleanPath}`;
  }

  private getAuthToken(): string {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('id_token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('admin_token') ||
      sessionStorage.getItem('access_token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('id_token') ||
      ''
    );
  }

  // Check safe feature flag from /api/service-config or /api/admin/backups/config
  public checkInitialModuleStatus() {
    this.http.get<any>(this.getApiUrl('/service-config')).subscribe({
      next: (res) => {
        if (res && res.backupModuleEnabled !== undefined) {
          this.backupModuleEnabled.set(res.backupModuleEnabled);
        }
      },
      error: () => {
        // Fallback to true if local
        this.backupModuleEnabled.set(true);
      }
    });
  }

  // Load configuration & metrics
  public loadConfig(): Observable<any> {
    return this.api.get<any>('/admin/backups/config', null, true).pipe(
      catchError((err) => {
        if (err?.status === 403) {
          this.backupModuleEnabled.set(false);
        }
        throw err;
      })
    );
  }

  public refreshConfig() {
    this.loadConfig().subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          const d: BackupConfig = res.data;
          this.config.set(d);
          this.backupModuleEnabled.set(d.backupModuleEnabled);
          this.isOverdue.set(d.isOverdue);
          this.overdueDays.set(d.overdueDays);
          this.totalCount.set(d.totalBackups);
          this.totalSizeBytes.set(d.totalSizeBytes);
          this.lastSuccessfulBackup.set(d.lastSuccessfulBackup);
          this.isBusy.set(d.isBusy);
          this.activeJob.set(d.activeJob);

          if (d.isBusy) {
            this.startJobPolling();
          } else {
            this.stopJobPolling();
          }
        }
      },
      error: (err) => {
        console.warn('[BACKUP SERVICE] Failed to load config:', err);
      }
    });
  }

  // Load history with pagination
  public loadHistory(page = 1, limit = 20): Observable<any> {
    this.isLoading.set(true);
    return this.api.get<any>('/admin/backups/history', { page, limit }, true);
  }

  public refreshHistory(page = 1, limit = 20) {
    this.loadHistory(page, limit).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.success) {
          this.history.set(res.data || []);
          this.totalCount.set(res.totalCount || 0);
          this.totalSizeBytes.set(res.totalSizeBytes || 0);
          this.isOverdue.set(res.isOverdue || false);
          this.overdueDays.set(res.overdueDays || 0);
          if (res.lastSuccessfulBackup) {
            this.lastSuccessfulBackup.set(res.lastSuccessfulBackup);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.warn('[BACKUP SERVICE] Failed to load history:', err);
      }
    });
  }

  // Create manual backup
  public createManualBackup(asyncMode = false): Observable<any> {
    this.isBusy.set(true);
    return this.api.post<any>(`/admin/backups/create${asyncMode ? '?async=true' : ''}`, {});
  }

  // Verify backup
  public verifyBackup(backupIdOrStoragePath: string): Observable<any> {
    return this.api.post<any>(`/admin/backups/verify/${encodeURIComponent(backupIdOrStoragePath)}`, {});
  }

  // Download backup ZIP directly from backend stream
  public downloadBackupFile(backupId: string, backupName: string) {
    const token = this.getAuthToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const downloadEndpoint = this.getApiUrl(`/admin/backups/download/${encodeURIComponent(backupId)}`);

    this.http
      .get(downloadEndpoint, {
        headers,
        responseType: 'blob'
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = backupName || '3dgalaxy-database-backup.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: async (err) => {
          console.error('[BACKUP SERVICE] Download error:', err);
          let message = err.message || 'Permission denied';
          if (err.error instanceof Blob) {
            try {
              const text = await err.error.text();
              const parsed = JSON.parse(text);
              if (parsed?.error || parsed?.message) {
                message = parsed.error || parsed.message;
              }
            } catch {}
          }
          alert('Failed to download backup archive: ' + message);
        }
      });
  }

  // Restore from Storage
  public restoreFromStorage(storagePath: string, confirmationText: string): Observable<any> {
    this.isBusy.set(true);
    return this.api.post<any>('/admin/backups/restore', {
      storagePath,
      confirmationText
    });
  }

  // Upload and restore from local file
  public uploadAndRestore(file: File, confirmationText: string): Observable<any> {
    this.isBusy.set(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirmationText', confirmationText);

    const token = this.getAuthToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const uploadEndpoint = this.getApiUrl('/admin/backups/upload-and-restore');
    return this.http.post<any>(uploadEndpoint, formData, { headers });
  }

  // Run on-demand health check
  public runHealthCheck(): Observable<any> {
    return this.api.get<any>('/admin/backups/health-check', null, true);
  }

  // Job Polling Mechanism (polls active job every 3 seconds while in progress)
  public startJobPolling() {
    if (this.pollSubscription) return;

    this.pollSubscription = timer(0, 3000)
      .pipe(
        switchMap(() => this.api.get<any>('/admin/backups/active-job', null, true)),
        catchError((err) => {
          console.warn('[BACKUP SERVICE] Job poll error:', err);
          return [];
        })
      )
      .subscribe((res: any) => {
        if (res?.success) {
          this.isBusy.set(res.isBusy);
          this.activeJob.set(res.job);

          // If job finished, stop polling and refresh data
          if (!res.isBusy) {
            this.stopJobPolling();
            this.refreshConfig();
            this.refreshHistory();
          }
        }
      });
  }

  public stopJobPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }
}
