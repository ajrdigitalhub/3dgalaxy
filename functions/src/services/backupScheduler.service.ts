import cron from 'node-cron';
import { ENV } from '../config/env';
import backupEngine from './backupEngine.service';
import { NotificationService } from './notification.service';

class BackupSchedulerService {
  private scheduledTask: any = null;
  private reminderTask: any = null;
  private lastOverdueAlertSent: number = 0;

  // Convert human weekday names to cron day numbers (0-6, where 0=Sunday)
  private dayNameToCron(day: string): number {
    const map: Record<string, number> = {
      sunday: 0,
      sun: 0,
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6
    };
    return map[day.toLowerCase().trim()] ?? 0;
  }

  // Generate cron expression based on ENV configuration
  public getCronExpression(): { cronExpr: string; description: string } {
    const timeParts = (ENV.BACKUP_TIME || '02:00').split(':');
    const hour = parseInt(timeParts[0] || '2', 10);
    const minute = parseInt(timeParts[1] || '0', 10);

    const isTwiceWeekly = ENV.BACKUP_SCHEDULE?.toLowerCase() === 'twice-weekly';

    if (isTwiceWeekly) {
      const days = (ENV.BACKUP_DAYS || 'Wednesday,Sunday')
        .split(',')
        .map((d) => this.dayNameToCron(d))
        .join(',');
      const cronExpr = `${minute} ${hour} * * ${days}`;
      return {
        cronExpr,
        description: `Twice-weekly on ${ENV.BACKUP_DAYS} at ${ENV.BACKUP_TIME} (${ENV.BACKUP_TIMEZONE})`
      };
    } else {
      const day = this.dayNameToCron(ENV.BACKUP_DAY || 'Sunday');
      const cronExpr = `${minute} ${hour} * * ${day}`;
      return {
        cronExpr,
        description: `Weekly on ${ENV.BACKUP_DAY} at ${ENV.BACKUP_TIME} (${ENV.BACKUP_TIMEZONE})`
      };
    }
  }

  public init() {
    if (!ENV.BACKUP_MODULE_ENABLED) {
      console.log('[BACKUP SCHEDULER] Backup module is disabled (BACKUP_MODULE_ENABLED=false). Scheduler will not start.');
      return;
    }

    if (!ENV.BACKUP_ENABLED) {
      console.log('[BACKUP SCHEDULER] Automatic scheduled backup is disabled (BACKUP_ENABLED=false).');
      return;
    }

    const { cronExpr, description } = this.getCronExpression();
    console.log(`[BACKUP SCHEDULER] Initializing backup schedule: "${cronExpr}" -> ${description}`);

    try {
      this.scheduledTask = cron.schedule(
        cronExpr,
        async () => {
          console.log('[BACKUP SCHEDULER] Scheduled backup trigger initiated...');
          await this.executeScheduledBackupWithRetry();
        },
        {
          timezone: ENV.BACKUP_TIMEZONE
        }
      );

      // Initialize daily overdue reminder check (runs daily at 10:00 AM)
      this.reminderTask = cron.schedule(
        '0 10 * * *',
        async () => {
          await this.checkBackupOverdueAndNotify();
        },
        {
          timezone: ENV.BACKUP_TIMEZONE
        }
      );

      console.log('[BACKUP SCHEDULER] Scheduled backup and health monitors active.');
    } catch (err) {
      console.error('[BACKUP SCHEDULER] Failed to initialize cron task:', err);
    }
  }

  // Execute backup with single controlled retry on failure
  public async executeScheduledBackupWithRetry(): Promise<void> {
    const attemptBackup = async (attempt: number): Promise<boolean> => {
      try {
        console.log(`[BACKUP SCHEDULER] Starting automated backup (Attempt ${attempt}/2)...`);
        const result = await backupEngine.createBackup({
          type: 'SCHEDULED',
          createdBy: 'AUTOMATED_SCHEDULER'
        });

        // Notify Admin of success
        await NotificationService.createSystemNotification({
          eventKey: 'BACKUP_SUCCESS' as any,
          title: 'Database Backup Completed',
          body: `Automatic database backup completed successfully. Size: ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB, Tables: ${result.tableCount}.`,
          deepLink: '/admin/settings/backups',
          metadata: {
            backupId: result.backupId,
            backupName: result.backupName,
            storagePath: result.storagePath,
            fileSize: result.fileSize,
            tableCount: result.tableCount,
            durationMs: result.durationMs
          }
        }).catch((notifErr) => console.warn('[BACKUP SCHEDULER] Could not send success notification:', notifErr));

        return true;
      } catch (err: any) {
        console.error(`[BACKUP SCHEDULER] Backup attempt ${attempt} failed:`, err?.message || err);
        return false;
      }
    };

    const firstAttemptSuccess = await attemptBackup(1);
    if (!firstAttemptSuccess) {
      console.log('[BACKUP SCHEDULER] Retrying scheduled backup in 30 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 30000));
      const secondAttemptSuccess = await attemptBackup(2);

      if (!secondAttemptSuccess) {
        console.error('[BACKUP SCHEDULER] All scheduled backup attempts failed.');

        // Dispatch failure notification
        await NotificationService.createSystemNotification({
          eventKey: 'BACKUP_FAILED' as any,
          title: 'Database Backup Failed',
          body: `Automatic scheduled database backup failed after retry. Please inspect the Database Backup dashboard immediately.`,
          deepLink: '/admin/settings/backups',
          metadata: {
            time: new Date().toISOString(),
            schedule: ENV.BACKUP_SCHEDULE
          }
        }).catch((notifErr) => console.warn('[BACKUP SCHEDULER] Could not send failure notification:', notifErr));
      }
    }
  }

  // Check if last backup was > 7 days ago and send overdue notification
  public async checkBackupOverdueAndNotify(): Promise<void> {
    try {
      const history = await backupEngine.getBackupHistory(1, 1);
      if (history.isOverdue) {
        const now = Date.now();
        // Debounce alert: send at most once every 48 hours to avoid spamming
        if (now - this.lastOverdueAlertSent > 48 * 60 * 60 * 1000) {
          this.lastOverdueAlertSent = now;
          const daysText = history.overdueDays < 900 ? `${history.overdueDays} days ago` : 'never';
          console.warn(`[BACKUP SCHEDULER] Backup overdue! Last backup was: ${daysText}`);

          await NotificationService.createSystemNotification({
            eventKey: 'BACKUP_OVERDUE' as any,
            title: 'Database Backup Overdue',
            body: `Your last successful database backup was ${daysText}. Please perform a manual database backup now to protect against data loss.`,
            deepLink: '/admin/settings/backups',
            metadata: {
              overdueDays: history.overdueDays,
              lastSuccessful: history.lastSuccessfulBackup?.createdAt || null
            }
          }).catch((e) => console.warn('[BACKUP SCHEDULER] Notification error:', e));
        }
      }
    } catch (err) {
      console.warn('[BACKUP SCHEDULER] Overdue check error:', err);
    }
  }

  public getNextRunDate(): string | null {
    // Estimated next run time
    const { cronExpr } = this.getCronExpression();
    return cronExpr;
  }

  public destroy() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }
    if (this.reminderTask) {
      this.reminderTask.stop();
      this.reminderTask = null;
    }
  }
}

export const backupScheduler = new BackupSchedulerService();
export default backupScheduler;
