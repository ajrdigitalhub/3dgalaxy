import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BackupService, BackupRecord } from '../../shared/services/backup.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-backup-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './backup-management.component.html',
  styleUrls: ['./backup-management.component.scss']
})
export class BackupManagementComponent implements OnInit, OnDestroy {
  public backupService = inject(BackupService);
  private toast = inject(ToastService);

  // Component UI State
  searchQuery = signal<string>('');
  filterType = signal<string>('ALL'); // ALL, MANUAL, SCHEDULED, PRE_RESTORE
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // Modals state
  showRestoreModal = signal<boolean>(false);
  showUploadModal = signal<boolean>(false);
  showDetailsModal = signal<boolean>(false);
  showHealthModal = signal<boolean>(false);
  selectedBackup = signal<BackupRecord | null>(null);

  // Restore form state
  restoreConfirmationInput = signal<string>('');
  isRestoringAction = signal<boolean>(false);
  selectedUploadFile = signal<File | null>(null);

  // Verification state
  isVerifyingId = signal<string | null>(null);
  verificationResult = signal<any | null>(null);

  // Health check state
  healthCheckLoading = signal<boolean>(false);
  healthCheckData = signal<any | null>(null);

  // Filtered backups list
  filteredBackups = computed(() => {
    const list = this.backupService.history();
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();

    return list.filter((b) => {
      const matchesType = type === 'ALL' || b.backupType === type;
      const matchesQuery =
        !query ||
        b.backupName?.toLowerCase().includes(query) ||
        b.checksum?.toLowerCase().includes(query) ||
        b.createdBy?.toLowerCase().includes(query) ||
        b.storagePath?.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  });

  ngOnInit() {
    this.refreshAll();
  }

  ngOnDestroy() {
    this.backupService.stopJobPolling();
  }

  refreshAll() {
    this.backupService.refreshConfig();
    this.backupService.refreshHistory(this.currentPage(), this.pageSize());
  }

  // -------------------------------------------------------------------------
  // MANUAL BACKUP TRIGGER
  // -------------------------------------------------------------------------
  triggerManualBackup() {
    if (this.backupService.isBusy()) {
      this.toast.error('A backup or restore operation is already in progress.');
      return;
    }

    if (!confirm('Start a complete database backup now? This will dump all tables, calculate SHA-256 checksums, and store the archive in Firebase Storage.')) {
      return;
    }

    this.toast.info('Database backup initiated. Monitor progress below.');

    // Use async mode so UI remains responsive and polls the stage
    this.backupService.createManualBackup(true).subscribe({
      next: (res) => {
        this.backupService.startJobPolling();
      },
      error: (err) => {
        this.toast.error(`Backup failed: ${err.message || 'Server error'}`);
        this.backupService.refreshConfig();
      }
    });
  }

  // -------------------------------------------------------------------------
  // VERIFICATION
  // -------------------------------------------------------------------------
  onVerifyBackup(backup: BackupRecord) {
    this.isVerifyingId.set(backup.id);
    this.toast.info(`Verifying backup integrity for "${backup.backupName}"...`);

    this.backupService.verifyBackup(backup.id).subscribe({
      next: (res) => {
        this.isVerifyingId.set(null);
        if (res?.success) {
          this.verificationResult.set(res.data);
          this.selectedBackup.set(backup);
          this.showDetailsModal.set(true);
          this.toast.success('Backup archive verified: SHA-256 and manifest match perfectly!');
          this.backupService.refreshHistory(this.currentPage(), this.pageSize());
        } else {
          this.toast.error(`Verification issue: ${res?.data?.errorMessage || 'Invalid archive'}`);
        }
      },
      error: (err) => {
        this.isVerifyingId.set(null);
        this.toast.error(`Verification failed: ${err.message || 'Error'}`);
      }
    });
  }

  // -------------------------------------------------------------------------
  // DOWNLOAD
  // -------------------------------------------------------------------------
  onDownloadBackup(backup: BackupRecord) {
    this.toast.info(`Preparing download for ${backup.backupName}...`);
    this.backupService.downloadBackupFile(backup.id, backup.backupName);
  }

  // -------------------------------------------------------------------------
  // DETAILS INSPECTION
  // -------------------------------------------------------------------------
  onViewDetails(backup: BackupRecord) {
    this.selectedBackup.set(backup);
    this.verificationResult.set(backup.verification || null);
    this.showDetailsModal.set(true);
  }

  // -------------------------------------------------------------------------
  // RESTORE MODAL OPEN
  // -------------------------------------------------------------------------
  openRestoreModal(backup: BackupRecord) {
    this.selectedBackup.set(backup);
    this.restoreConfirmationInput.set('');
    this.showRestoreModal.set(true);
  }

  closeRestoreModal() {
    if (this.isRestoringAction()) return;
    this.showRestoreModal.set(false);
    this.selectedBackup.set(null);
    this.restoreConfirmationInput.set('');
  }

  // Execute Restore from Firebase Storage
  executeRestore() {
    const backup = this.selectedBackup();
    if (!backup) return;

    if (this.restoreConfirmationInput().trim() !== 'RESTORE DATABASE') {
      this.toast.error('You must type "RESTORE DATABASE" exactly to proceed.');
      return;
    }

    this.isRestoringAction.set(true);
    this.toast.info('Restoration underway: Creating pre-restore safety backup...');

    this.backupService.restoreFromStorage(backup.storagePath, 'RESTORE DATABASE').subscribe({
      next: (res) => {
        this.isRestoringAction.set(false);
        this.closeRestoreModal();
        this.toast.success('Database restored successfully! System health checks passed.');
        this.refreshAll();
      },
      error: (err) => {
        this.isRestoringAction.set(false);
        this.toast.error(`Restore failed: ${err.message || 'Database error'}`);
        this.backupService.refreshConfig();
      }
    });
  }

  // -------------------------------------------------------------------------
  // UPLOAD LOCAL ZIP MODAL
  // -------------------------------------------------------------------------
  openUploadModal() {
    this.selectedUploadFile.set(null);
    this.restoreConfirmationInput.set('');
    this.showUploadModal.set(true);
  }

  closeUploadModal() {
    if (this.isRestoringAction()) return;
    this.showUploadModal.set(false);
    this.selectedUploadFile.set(null);
    this.restoreConfirmationInput.set('');
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file: File = files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        this.toast.error('Please select a valid .zip backup archive file.');
        return;
      }
      this.selectedUploadFile.set(file);
    }
  }

  executeUploadAndRestore() {
    const file = this.selectedUploadFile();
    if (!file) {
      this.toast.error('Please select a backup ZIP file to upload.');
      return;
    }

    if (this.restoreConfirmationInput().trim() !== 'RESTORE DATABASE') {
      this.toast.error('You must type "RESTORE DATABASE" exactly to proceed.');
      return;
    }

    this.isRestoringAction.set(true);
    this.toast.info('Uploading and validating backup archive...');

    this.backupService.uploadAndRestore(file, 'RESTORE DATABASE').subscribe({
      next: (res) => {
        this.isRestoringAction.set(false);
        this.closeUploadModal();
        this.toast.success('Uploaded backup restored successfully! Database verified.');
        this.refreshAll();
      },
      error: (err) => {
        this.isRestoringAction.set(false);
        this.toast.error(`Uploaded restore failed: ${err.message || 'Error'}`);
        this.backupService.refreshConfig();
      }
    });
  }

  // -------------------------------------------------------------------------
  // ON-DEMAND HEALTH CHECK
  // -------------------------------------------------------------------------
  runHealthCheck() {
    this.healthCheckLoading.set(true);
    this.showHealthModal.set(true);

    this.backupService.runHealthCheck().subscribe({
      next: (res) => {
        this.healthCheckLoading.set(false);
        this.healthCheckData.set(res?.data || null);
      },
      error: (err) => {
        this.healthCheckLoading.set(false);
        this.healthCheckData.set({ healthy: false, errors: [err.message || 'Health check error'] });
      }
    });
  }

  closeHealthModal() {
    this.showHealthModal.set(false);
    this.healthCheckData.set(null);
  }

  // -------------------------------------------------------------------------
  // FORMATTING HELPERS
  // -------------------------------------------------------------------------
  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms: number | null | undefined): string {
    if (!ms || ms <= 0) return '-';
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  }

  copyChecksum(checksum: string) {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    this.toast.success('SHA-256 checksum copied to clipboard!');
  }
}
