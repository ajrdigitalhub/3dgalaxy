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
    const hour = isNaN(parseInt(timeParts[0] || '2', 10)) ? 2 : parseInt(timeParts[0] || '2', 10);
    const minute = isNaN(parseInt(timeParts[1] || '0', 10)) ? 0 : parseInt(timeParts[1] || '0', 10);

    const scheduleType = (ENV.BACKUP_SCHEDULE || 'daily').toLowerCase().trim();

    if (scheduleType === 'hourly') {
      const cronExpr = `${minute} * * * *`;
      return {
        cronExpr,
        description: `Hourly at minute :${String(minute).padStart(2, '0')} (${ENV.BACKUP_TIMEZONE})`
      };
    } else if (scheduleType === 'daily') {
      const cronExpr = `${minute} ${hour} * * *`;
      return {
        cronExpr,
        description: `Daily at ${ENV.BACKUP_TIME} (${ENV.BACKUP_TIMEZONE})`
      };
    } else if (scheduleType === 'twice-weekly') {
      const days = (ENV.BACKUP_DAYS || 'Wednesday,Sunday')
        .split(',')
        .map((d) => this.dayNameToCron(d))
        .join(',');
      const cronExpr = `${minute} ${hour} * * ${days}`;
      return {
        cronExpr,
        description: `Twice-weekly on ${ENV.BACKUP_DAYS} at ${ENV.BACKUP_TIME} (${ENV.BACKUP_TIMEZONE})`
      };
    } else if (scheduleType === 'monthly') {
      const cronExpr = `${minute} ${hour} 1 * *`;
      return {
        cronExpr,
        description: `Monthly on the 1st at ${ENV.BACKUP_TIME} (${ENV.BACKUP_TIMEZONE})`
      };
    } else {
      // Default: daily at 02:00
      const cronExpr = `${minute} ${hour} * * *`;
      return {
        cronExpr,
        description: `Daily at ${ENV.BACKUP_TIME || '02:00'} (${ENV.BACKUP_TIMEZONE || 'Asia/Kolkata'})`
      };
    }
  }

  public init() {
    this.destroy();

    if (!ENV.BACKUP_MODULE_ENABLED) {
      console.log('[BACKUP SCHEDULER] Backup module is disabled (BACKUP_MODULE_ENABLED=false). Scheduler will not start.');
      return;
    }

    if (!ENV.BACKUP_ENABLED) {
      console.log('[BACKUP SCHEDULER] Automatic scheduled backup is disabled (BACKUP_ENABLED=false).');
      return;
    }

    const { cronExpr, description } = this.getCronExpression();

    if (!cron.validate(cronExpr)) {
      console.error(`[BACKUP SCHEDULER] Invalid cron expression calculated: "${cronExpr}". Falling back to daily 02:00.`);
    }

    const safeCronExpr = cron.validate(cronExpr) ? cronExpr : '0 2 * * 3,0';
    console.log(`[BACKUP SCHEDULER] Initializing backup schedule: "${safeCronExpr}" -> ${description}`);

    try {
      // Active: Automated Daily Database Backup
      this.scheduledTask = cron.schedule(
        safeCronExpr,
        async () => {
          console.log('[BACKUP SCHEDULER] Scheduled backup trigger initiated...');
          await this.executeScheduledBackupWithRetry();
        },
        {
          timezone: ENV.BACKUP_TIMEZONE
        }
      );

      // CRON ACTIVITY DISABLED: Daily Overdue Reminder Check (runs daily at 10:00 AM)
      // this.reminderTask = cron.schedule(
      //   '0 10 * * *',
      //   async () => {
      //     await this.checkBackupOverdueAndNotify();
      //   },
      //   {
      //     timezone: ENV.BACKUP_TIMEZONE
      //   }
      // );

      console.log(`[BACKUP SCHEDULER] Automated backup active (${safeCronExpr}: ${description}). Retention: Keep last ${ENV.BACKUP_RETENTION_DAYS} days.`);
      // Initial non-blocking retention cleanup to prune expired backups (> 10 days)
      backupEngine.applyRetentionPolicy().catch((retErr) => {
        console.warn('[BACKUP SCHEDULER] Initial retention cleanup warning:', retErr);
      });
    } catch (err) {
      console.error('[BACKUP SCHEDULER] Failed to initialize cron task:', err);
    }
  }

  public getStatus() {
    const { cronExpr, description } = this.getCronExpression();
    return {
      isInitialized: this.scheduledTask !== null,
      moduleEnabled: ENV.BACKUP_MODULE_ENABLED,
      autoBackupEnabled: ENV.BACKUP_ENABLED,
      cronExpression: cronExpr,
      description,
      timezone: ENV.BACKUP_TIMEZONE,
      scheduleType: ENV.BACKUP_SCHEDULE,
      backupDays: ENV.BACKUP_DAYS,
      backupTime: ENV.BACKUP_TIME,
      retentionCount: ENV.BACKUP_RETENTION_COUNT
    };
  }

  // Evaluate whether a backup is currently due based on schedule, weekday, and elapsed hours
  public async isBackupDue(now: Date = new Date()): Promise<{
    isDue: boolean;
    reason: string;
    elapsedHours: number;
    lastBackupDate: Date | null;
    currentWeekday: string;
  }> {
    const tz = ENV.BACKUP_TIMEZONE || 'Asia/Kolkata';
    const dateInTz = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz }); // 'YYYY-MM-DD'
    const weekdayInTz = (d: Date) => d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long' }).toLowerCase();

    const todayStr = dateInTz(now);
    const currentWeekday = weekdayInTz(now);

    const history = await backupEngine.getBackupHistory(1, 1).catch(() => null);
    const lastBackup = history?.lastSuccessfulBackup;

    if (!lastBackup) {
      return {
        isDue: true,
        reason: 'No previous successful backup found in database or cloud storage.',
        elapsedHours: 9999,
        lastBackupDate: null,
        currentWeekday
      };
    }

    const lastDate = new Date(lastBackup.createdAt);
    const lastDateStr = dateInTz(lastDate);
    const elapsedMs = now.getTime() - lastDate.getTime();
    const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));

    // If a backup already completed successfully today (same calendar date in target TZ), do not duplicate
    if (todayStr === lastDateStr) {
      return {
        isDue: false,
        reason: `A successful database backup (${lastBackup.backupName}) already completed today (${todayStr}).`,
        elapsedHours,
        lastBackupDate: lastDate,
        currentWeekday
      };
    }

    const scheduleType = (ENV.BACKUP_SCHEDULE || 'daily').toLowerCase().trim();

    if (scheduleType === 'hourly') {
      if (elapsedHours >= 1) {
        return {
          isDue: true,
          reason: `Hourly schedule due (${elapsedHours.toFixed(1)} hours elapsed since last backup).`,
          elapsedHours,
          lastBackupDate: lastDate,
          currentWeekday
        };
      }
    } else if (scheduleType === 'daily') {
      if (elapsedHours >= 18) {
        return {
          isDue: true,
          reason: `Daily schedule due (${elapsedHours.toFixed(1)} hours elapsed, new calendar day).`,
          elapsedHours,
          lastBackupDate: lastDate,
          currentWeekday
        };
      }
    } else if (scheduleType === 'twice-weekly') {
      const scheduledDays = (ENV.BACKUP_DAYS || 'Wednesday,Sunday')
        .toLowerCase()
        .split(',')
        .map((s) => s.trim());

      // If today is one of the scheduled days and none was done today
      if (scheduledDays.includes(currentWeekday)) {
        return {
          isDue: true,
          reason: `Today (${currentWeekday}) is a scheduled backup day (${ENV.BACKUP_DAYS}) and no backup was completed today.`,
          elapsedHours,
          lastBackupDate: lastDate,
          currentWeekday
        };
      }

      // Catch-up condition: gap between backups should not exceed ~84 hours (3.5 days)
      if (elapsedHours >= 84) {
        return {
          isDue: true,
          reason: `Scheduled backup is overdue for catch-up (${elapsedHours.toFixed(1)} hours elapsed since last backup).`,
          elapsedHours,
          lastBackupDate: lastDate,
          currentWeekday
        };
      }
    } else if (scheduleType === 'monthly') {
      const dayOfMonth = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(now), 10);
      if (dayOfMonth === 1 || elapsedHours >= 672) {
        return {
          isDue: true,
          reason: `Monthly schedule due (${dayOfMonth === 1 ? '1st of month' : `${elapsedHours.toFixed(1)} hours elapsed`}).`,
          elapsedHours,
          lastBackupDate: lastDate,
          currentWeekday
        };
      }
    }

    // Universal overdue safeguard (over 4 days without any backup)
    if (elapsedHours >= 96) {
      return {
        isDue: true,
        reason: `Backup overdue for catch-up (${elapsedHours.toFixed(1)} hours elapsed without backup).`,
        elapsedHours,
        lastBackupDate: lastDate,
        currentWeekday
      };
    }

    return {
      isDue: false,
      reason: `Backup is up to date (${elapsedHours.toFixed(1)} hours elapsed; scheduled on ${ENV.BACKUP_DAYS || 'Wednesday,Sunday'}).`,
      elapsedHours,
      lastBackupDate: lastDate,
      currentWeekday
    };
  }

  // High-level trigger method: evaluates if backup is due (or forced) and executes safely
  public async runScheduledBackupIfDue(force = false): Promise<{
    executed: boolean;
    reason: string;
    result?: any;
    error?: string;
    dueCheck?: any;
  }> {
    if (!ENV.BACKUP_MODULE_ENABLED) {
      console.log('[BACKUP SCHEDULER] Backup module disabled by ENV. Skipping scheduled backup.');
      return { executed: false, reason: 'BACKUP_MODULE_DISABLED' };
    }

    if (!ENV.BACKUP_ENABLED && !force) {
      console.log('[BACKUP SCHEDULER] Automatic backups disabled (BACKUP_ENABLED=false). Skipping.');
      return { executed: false, reason: 'AUTO_BACKUP_DISABLED' };
    }

    if (backupEngine.isBusy()) {
      console.warn('[BACKUP SCHEDULER] Backup engine is currently busy with another operation. Skipping trigger.');
      return { executed: false, reason: 'BACKUP_ENGINE_BUSY', result: backupEngine.getActiveJob() };
    }

    const dueCheck = await this.isBackupDue(new Date());

    if (!force && !dueCheck.isDue) {
      console.log(`[BACKUP SCHEDULER] Backup check skipped: ${dueCheck.reason}`);
      return { executed: false, reason: dueCheck.reason, dueCheck };
    }

    console.log(`[BACKUP SCHEDULER] Executing scheduled backup (${force ? 'FORCED_TRIGGER' : dueCheck.reason})...`);
    const execution = await this.executeScheduledBackupWithRetry();

    return {
      executed: execution.success,
      reason: force ? 'FORCED_TRIGGER' : dueCheck.reason,
      result: execution.result,
      error: execution.error,
      dueCheck
    };
  }

  // Execute backup with single controlled retry on failure
  public async executeScheduledBackupWithRetry(): Promise<{ success: boolean; result?: any; error?: string }> {
    let lastResult: any = null;
    let lastError: string | null = null;

    const attemptBackup = async (attempt: number): Promise<boolean> => {
      try {
        console.log(`[BACKUP SCHEDULER] Starting automated backup (Attempt ${attempt}/2)...`);
        const result = await backupEngine.createBackup({
          type: 'SCHEDULED',
          createdBy: 'AUTOMATED_SCHEDULER'
        });

        lastResult = result;

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
        lastError = err?.message || String(err);
        console.error(`[BACKUP SCHEDULER] Backup attempt ${attempt} failed:`, lastError);
        return false;
      }
    };

    const firstAttemptSuccess = await attemptBackup(1);
    if (firstAttemptSuccess) {
      return { success: true, result: lastResult };
    }

    console.log('[BACKUP SCHEDULER] Retrying scheduled backup in 30 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 30000));
    const secondAttemptSuccess = await attemptBackup(2);

    if (secondAttemptSuccess) {
      return { success: true, result: lastResult };
    }

    console.error('[BACKUP SCHEDULER] All scheduled backup attempts failed.');

    // Dispatch failure notification
    await NotificationService.createSystemNotification({
      eventKey: 'BACKUP_FAILED' as any,
      title: 'Database Backup Failed',
      body: `Automatic scheduled database backup failed after retry. Please inspect the Database Backup dashboard immediately.`,
      deepLink: '/admin/settings/backups',
      metadata: {
        time: new Date().toISOString(),
        schedule: ENV.BACKUP_SCHEDULE,
        error: lastError
      }
    }).catch((notifErr) => console.warn('[BACKUP SCHEDULER] Could not send failure notification:', notifErr));

    return { success: false, error: lastError || 'Scheduled backup failed after retry' };
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
