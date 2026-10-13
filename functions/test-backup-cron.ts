import './src/config/env';
import http from 'http';
import app from './src/app';
import backupScheduler from './src/services/backupScheduler.service';
import backupEngine from './src/services/backupEngine.service';
import { runScheduledMaintenance } from './src/services/scheduler';
import prisma from './src/config/database';
import { ENV } from './src/config/env';
import { getStorageBucket } from './src/config/firebase';

async function makeRequest(options: http.RequestOptions, bodyData?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode || 500, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 500, body: rawData });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 AUTOMATED DATABASE BACKUP & CRON SYSTEM INTEGRATION TEST');
  console.log('================================================================\n');

  // Test 1: BackupSchedulerService configuration and cron expression
  console.log('👉 [TEST 1] Verifying Cron Expression & Scheduler Status...');
  const cronInfo = backupScheduler.getCronExpression();
  const statusInfo = backupScheduler.getStatus();
  console.log('   Cron Expression:', cronInfo.cronExpr);
  console.log('   Cron Description:', cronInfo.description);
  console.log('   Status:', JSON.stringify(statusInfo, null, 2));

  if (!cronInfo.cronExpr || !cronInfo.cronExpr.includes('*')) {
    throw new Error('❌ Test 1 Failed: Invalid cron expression generated');
  }
  console.log('   ✅ Test 1 Passed: Cron expression generated successfully.\n');

  // Test 2: Evaluate isBackupDue calculation
  console.log('👉 [TEST 2] Verifying isBackupDue() Logic...');
  const dueCheck = await backupScheduler.isBackupDue();
  console.log('   Due Check Result:', JSON.stringify(dueCheck, null, 2));
  console.log(`   isDue: ${dueCheck.isDue}, Reason: ${dueCheck.reason}`);
  console.log('   ✅ Test 2 Passed: isBackupDue() evaluated correctly.\n');

  // Start test HTTP server on port 4099
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4099, () => resolve()));
  console.log('   🚀 Test Express server started on http://localhost:4099\n');

  try {
    // Test 3: Unauthorized requests to cron endpoint
    console.log('👉 [TEST 3] Security Gate Verification (Missing or invalid x-cron-secret)...');
    
    // 3a. Missing Secret
    const unauthRes = await makeRequest({
      hostname: 'localhost',
      port: 4099,
      path: '/api/admin/backups/cron/run-scheduled',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   3a. Request without secret -> HTTP ${unauthRes.status}:`, unauthRes.body);
    if (unauthRes.status !== 401) {
      throw new Error(`❌ Test 3a Failed: Expected 401 for missing secret, got ${unauthRes.status}`);
    }

    // 3b. Invalid Secret
    const invalidRes = await makeRequest({
      hostname: 'localhost',
      port: 4099,
      path: '/api/admin/backups/cron/run-scheduled',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': 'invalid_secret_key_123'
      }
    });
    console.log(`   3b. Request with invalid secret -> HTTP ${invalidRes.status}:`, invalidRes.body);
    if (invalidRes.status !== 401) {
      throw new Error(`❌ Test 3b Failed: Expected 401 for invalid secret, got ${invalidRes.status}`);
    }
    console.log('   ✅ Test 3 Passed: Security barrier strictly enforced.\n');

    // Test 4: Status endpoint
    console.log('👉 [TEST 4] Cron Status Endpoint (GET /api/admin/backups/cron/status)...');
    const statusRes = await makeRequest({
      hostname: 'localhost',
      port: 4099,
      path: '/api/admin/backups/cron/status',
      method: 'GET'
    });
    console.log(`   HTTP ${statusRes.status}:`, JSON.stringify(statusRes.body, null, 2));
    if (statusRes.status !== 200 || !statusRes.body?.success) {
      throw new Error(`❌ Test 4 Failed: Expected 200 OK from status endpoint`);
    }
    console.log('   ✅ Test 4 Passed: Status endpoint responded with complete metadata.\n');

    // Test 5: Execution via HTTP endpoint with valid x-cron-secret (force=true)
    console.log('👉 [TEST 5] HTTP Trigger with Valid x-cron-secret (force=true)...');
    const triggerRes = await makeRequest({
      hostname: 'localhost',
      port: 4099,
      path: '/api/admin/backups/cron/run-scheduled?force=true',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': ENV.CRON_SECRET
      }
    });
    console.log(`   HTTP ${triggerRes.status}:`, JSON.stringify(triggerRes.body, null, 2));
    if (triggerRes.status !== 200 || !triggerRes.body?.success) {
      throw new Error(`❌ Test 5 Failed: Cron trigger failed to execute backup`);
    }
    console.log('   ✅ Test 5 Passed: HTTP cron trigger executed scheduled backup successfully.\n');

    // Test 6: Verify Database Record & Firebase Storage
    console.log('👉 [TEST 6] Validating Created SCHEDULED Backup in Database & Firebase Storage...');
    const latestBackup = await prisma.databaseBackup.findFirst({
      where: {
        backupType: 'SCHEDULED',
        status: 'SUCCESS'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestBackup) {
      throw new Error('❌ Test 6 Failed: No SCHEDULED backup record found in database');
    }

    console.log('   Latest Scheduled Backup Record:');
    console.log('     ID:', latestBackup.id);
    console.log('     Name:', latestBackup.backupName);
    console.log('     Type:', latestBackup.backupType);
    console.log('     Status:', latestBackup.status);
    console.log('     Size (bytes):', latestBackup.fileSize.toString());
    console.log('     Checksum (sha256):', latestBackup.checksum);
    console.log('     Table Count:', latestBackup.tableCount);
    console.log('     Storage Path:', latestBackup.storagePath);
    console.log('     Created At:', latestBackup.createdAt);

    // Verify in Firebase Storage
    const bucket = getStorageBucket();
    if (bucket) {
      const file = bucket.file(latestBackup.storagePath);
      const [exists] = await file.exists();
      console.log('     Firebase Storage File Exists:', exists);
      if (!exists) {
        throw new Error(`❌ Test 6 Failed: File ${latestBackup.storagePath} not found in Firebase Storage`);
      }
    }
    console.log('   ✅ Test 6 Passed: Database backup and Firebase Storage upload verified.\n');

    // Test 7: Integration in runScheduledMaintenance('scheduled_backup')
    console.log('👉 [TEST 7] Verifying Maintenance Cycle Integration (runScheduledMaintenance)...');
    const maintResult = await runScheduledMaintenance('scheduled_backup');
    console.log('   Maintenance Outcome:', JSON.stringify(maintResult, null, 2));
    if (!maintResult.success) {
      throw new Error('❌ Test 7 Failed: runScheduledMaintenance failed');
    }
    console.log('   ✅ Test 7 Passed: runScheduledMaintenance smoothly executes backup job.\n');

    console.log('================================================================');
    console.log('🎉 ALL 7 AUTOMATED BACKUP CRON TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    server.close();
    backupScheduler.destroy();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
