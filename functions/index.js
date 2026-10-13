const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

// Correct Path: Pointing to the compiled bundle, NOT ./src/app
const mod = require('./dist/server.js');
const app = mod.default || mod;
const backupScheduler = mod.backupScheduler;

// Production Export 
// Firebase automatically loads the variables from your .env file into process.env
exports.api = onRequest({ 
  cors: true,
  memory: "512MiB",       // Allocated extra overhead for Prisma engine binary processing
  timeoutSeconds: 60     // Gives the Supabase database connection plenty of time to warm up
}, app);

/**
 * Cloud Scheduler Native Firebase Function
 * Schedule: Wednesday & Sunday at 02:00 AM IST (Cron: 0 2 * * 0,3)
 * Runs automated database backup and retention cleanup natively via Google Cloud Scheduler
 */
exports.scheduledDatabaseBackup = onSchedule({
  schedule: '0 2 * * 0,3',
  timeZone: 'Asia/Kolkata',
  memory: '1GiB',
  timeoutSeconds: 300,
  retryCount: 1
}, async (_event) => {
  console.log('[FIREBASE CRON] Cloud Scheduler database backup triggered at:', new Date().toISOString());
  try {
    const scheduler = backupScheduler || require('./dist/server.js').backupScheduler;
    if (scheduler && typeof scheduler.runScheduledBackupIfDue === 'function') {
      const outcome = await scheduler.runScheduledBackupIfDue(true);
      console.log('[FIREBASE CRON] Database backup outcome:', outcome);
      return outcome;
    } else {
      console.error('[FIREBASE CRON] backupScheduler is not available in dist/server.js');
    }
  } catch (err) {
    console.error('[FIREBASE CRON] Scheduled database backup exception:', err);
    throw err;
  }
});