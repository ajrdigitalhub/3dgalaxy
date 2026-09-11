import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import prisma from '../src/config/database';
import backupEngine from '../src/services/backupEngine.service';
import { getStorageBucket } from '../src/config/firebase';
import AdmZip from 'adm-zip';

async function runAcceptanceTests() {
  console.log('============================================================');
  console.log('STARTING ACCEPTANCE TESTS FOR 3D GALAXY DISASTER RECOVERY');
  console.log('============================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // -------------------------------------------------------------------------
  // TEST H: FUTURE TABLE INCLUSION TEST
  // -------------------------------------------------------------------------
  console.log('--- TEST H: Future Table Automatic Inclusion ---');
  const tempTableName = '_test_future_feature_compliance';
  try {
    // 1. Create a dynamic table not known to Prisma schema or backup code
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tempTableName}" (
        id SERIAL PRIMARY KEY,
        feature_name VARCHAR(255) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tempTableName}" (feature_name, metadata)
      VALUES ('AI Product Visualizer 3D', '{"active": true, "version": "2.0"}');
    `);
    console.log(`[+] Created temporary future table: "${tempTableName}" with test record`);

    // 2. Run backup
    console.log('[*] Running native database backup...');
    const backupResult = await backupEngine.createBackup({
      type: 'MANUAL',
      createdBy: 'AcceptanceTester',
    });

    console.log(`[+] Backup created: ${backupResult.backupName}`);
    console.log(`[+] Storage path: ${backupResult.storagePath}`);
    console.log(`[+] Total tables dumped: ${backupResult.tableCount}`);

    // 3. Verify backup checksum & manifest
    const verifyResult = await backupEngine.verifyBackup(backupResult.backupId);
    if (!verifyResult.valid) {
      throw new Error(`Backup verification failed: ${verifyResult.errorMessage}`);
    }
    console.log('[+] Backup verification passed (Checksum and structure valid)');

    // 4. Inspect the manifest and database.sql directly by downloading from Firebase Storage
    const bucket = getStorageBucket();
    const [downloadBuffer] = await bucket.file(backupResult.storagePath).download();
    const zip = new AdmZip(downloadBuffer);
    
    // Check entries inside ZIP
    const zipEntries = zip.getEntries().map(e => e.entryName);
    console.log(`[+] ZIP Entries: ${zipEntries.join(', ')}`);

    // Check manifest
    const manifestEntry = zip.getEntry('metadata/manifest.json');
    if (!manifestEntry) throw new Error('metadata/manifest.json missing in ZIP');
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    console.log(`[+] Manifest tableCount: ${manifest.tableCount}, imageFilesIncluded: ${manifest.imageFilesIncluded}`);

    // Check database.sql for future table
    const sqlEntry = zip.getEntry('database/database.sql');
    if (!sqlEntry) throw new Error('database/database.sql missing in ZIP');
    const sqlContent = sqlEntry.getData().toString('utf8');

    const hasFutureTable = sqlContent.includes(tempTableName);
    const hasFutureData = sqlContent.includes('AI Product Visualizer 3D');

    if (hasFutureTable && hasFutureData) {
      console.log(`[PASS] TEST H PASSED: Future table "${tempTableName}" and its rows were automatically captured by pg_dump!`);
      testsPassed++;
    } else {
      console.error(`[FAIL] TEST H FAILED: Future table was NOT found in database.sql`);
      testsFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST I: IMAGE FILE EXCLUSION & IMAGE URL INCLUSION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- TEST I: Image Files Excluded & Image URLs Included ---');
    // Check for any image binary files in ZIP
    const hasImageFiles = zipEntries.some(name => 
      /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(name)
    );

    if (hasImageFiles) {
      console.error('[FAIL] TEST I FAILED: Found actual image media files inside backup ZIP!');
      testsFailed++;
    } else {
      console.log('[+] Confirmed: 0 image media files present inside backup ZIP');
    }

    // Check for image URLs in the database dump
    const hasImageUrls = sqlContent.includes('http') || sqlContent.includes('firebasestorage') || sqlContent.includes('imageUrl');
    if (hasImageUrls && !hasImageFiles) {
      console.log('[PASS] TEST I PASSED: Image URLs are preserved in database.sql, actual media files are strictly excluded!');
      testsPassed++;
    } else {
      console.error('[FAIL] TEST I FAILED: Image URLs check failed');
      testsFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST J & K: FEATURE FLAG ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST J & K: Feature Flag Server-Side Enforcement ---');
    const { requireBackupModuleEnabled } = await import('../src/routes/backup.routes');
    
    // Simulate req/res with feature disabled
    const originalEnv = process.env.BACKUP_MODULE_ENABLED;
    process.env.BACKUP_MODULE_ENABLED = 'false';

    let returnedStatus = 0;
    let returnedBody: any = null;

    const mockReq: any = {};
    const mockRes: any = {
      status: (code: number) => {
        returnedStatus = code;
        return {
          json: (body: any) => {
            returnedBody = body;
          }
        };
      }
    };
    const mockNext = () => {};

    requireBackupModuleEnabled(mockReq, mockRes, mockNext);

    if (returnedStatus === 403 && returnedBody?.code === 'FEATURE_DISABLED') {
      console.log('[PASS] TEST J & K PASSED: Server-side middleware rejected request with 403 FEATURE_DISABLED when BACKUP_MODULE_ENABLED=false!');
      testsPassed++;
    } else {
      console.error(`[FAIL] TEST J & K FAILED: Middleware returned status ${returnedStatus}`);
      testsFailed++;
    }

    // Restore original env
    process.env.BACKUP_MODULE_ENABLED = originalEnv;

    // -------------------------------------------------------------------------
    // TEST L & M: SUPER ADMIN RESTORE AUTHORIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST L & M: Super Admin Restore Authorization ---');
    const { requireSuperAdminForRestore } = await import('../src/routes/backup.routes');

    let normalAdminBlocked = false;
    const adminReq: any = { user: { role: 'admin', email: 'admin@3dgalaxy.com' } };
    const adminRes: any = {
      status: (code: number) => {
        if (code === 403) normalAdminBlocked = true;
        return { json: () => {} };
      }
    };
    requireSuperAdminForRestore(adminReq, adminRes, () => {});

    let superAdminAllowed = false;
    const superAdminReq: any = { user: { role: 'super-admin', email: 'superadmin@3dgalaxy.com' } };
    const superAdminRes: any = { status: () => ({ json: () => {} }) };
    requireSuperAdminForRestore(superAdminReq, superAdminRes, () => {
      superAdminAllowed = true;
    });

    if (normalAdminBlocked && superAdminAllowed) {
      console.log('[PASS] TEST L & M PASSED: Normal Admin is blocked (403), Super Admin is permitted!');
      testsPassed++;
    } else {
      console.error(`[FAIL] TEST L & M FAILED: Normal admin blocked: ${normalAdminBlocked}, Super admin allowed: ${superAdminAllowed}`);
      testsFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 36-38: HEALTH CHECK & RELATIONAL INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST: Database Health & Sequence Integrity ---');
    const healthResult = await backupEngine.performHealthCheck();
    console.log(`[+] Database Healthy: ${healthResult.healthy}`);
    console.log(`[+] Tables & Counts:`, healthResult.counts);
    console.log(`[+] Relational Integrity Checks:`, healthResult.checks);

    if (healthResult.healthy && healthResult.checks.productVariantsLinked && healthResult.checks.orderItemsLinked) {
      console.log('[PASS] System Health & Relational Integrity check PASSED!');
      testsPassed++;
    } else {
      console.error('[FAIL] System Health check returned warnings');
      testsFailed++;
    }

  } finally {
    // Cleanup temporary table
    console.log('\n[*] Cleaning up temporary test table...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tempTableName}" CASCADE;`);
    console.log(`[+] Dropped "${tempTableName}"`);
    await prisma.$disconnect();
  }

  console.log('\n============================================================');
  console.log(`FINAL RESULT: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('============================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Acceptance tests fatal error:', err);
  process.exit(1);
});
