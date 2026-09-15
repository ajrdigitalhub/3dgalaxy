import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import AdmZip from 'adm-zip';
const archiver = require('archiver');
import prisma, { pool } from '../config/database';
import { ENV } from '../config/env';
import { getStorageBucket } from '../config/firebase';
import { clearSettingsCache } from '../controllers/settings';

export type BackupStage =
  | 'IDLE'
  | 'PREPARING'
  | 'DUMPING'
  | 'PACKAGING'
  | 'UPLOADING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESTORING'
  | 'RESTORE_SAFETY_BACKUP'
  | 'RESTORE_EXECUTING'
  | 'RESTORE_HEALTH_CHECK'
  | 'RESTORE_COMPLETED'
  | 'RESTORE_FAILED';

export interface ActiveJobState {
  jobId: string;
  type: 'MANUAL' | 'SCHEDULED' | 'PRE_RESTORE' | 'RESTORE';
  stage: BackupStage;
  progressPercent: number;
  startedAt: string;
  updatedAt: string;
  targetBackupId?: string;
  backupName?: string;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface BackupManifest {
  application: string;
  backupType: string;
  backupVersion: string;
  createdAt: string;
  databaseType: string;
  databaseVersion?: string;
  tableCount: number;
  imageFilesIncluded: boolean;
  imageUrlsIncluded: boolean;
  storagePath: string;
  checksumAlgorithm: string;
  checksum: string;
}

export interface RestoreValidationResult {
  valid: boolean;
  tableCount?: number;
  databaseVersion?: string;
  createdAt?: string;
  checksumMatches?: boolean;
  errorMessage?: string;
  manifest?: BackupManifest;
}

export interface HealthCheckResult {
  healthy: boolean;
  databaseConnected: boolean;
  timestamp: string;
  counts: {
    users: number;
    customers: number;
    categories: number;
    products: number;
    productVariants: number;
    orders: number;
    orderItems: number;
    reviews: number;
    banners: number;
    whatsappMessages: number;
    themeSettings: number;
  };
  checks: {
    productVariantsLinked: boolean;
    orderItemsLinked: boolean;
    customerOrdersLinked: boolean;
  };
  errors?: string[];
}

export class BackupEngineService {
  private activeJob: ActiveJobState | null = null;

  // -------------------------------------------------------------------------
  // CONCURRENCY LOCK
  // -------------------------------------------------------------------------
  public isBusy(): boolean {
    if (this.activeJob) {
      const updatedAt = new Date(this.activeJob.updatedAt || this.activeJob.startedAt).getTime();
      if (Date.now() - updatedAt > 30 * 60 * 1000) {
        console.warn(`[BACKUP ENGINE] Active job ${this.activeJob.jobId} is stale (no activity for 30m). Clearing lock.`);
        this.activeJob = null;
        return false;
      }
    }
    return this.activeJob !== null && !['COMPLETED', 'FAILED', 'RESTORE_COMPLETED', 'RESTORE_FAILED'].includes(this.activeJob.stage);
  }

  public getActiveJob(): ActiveJobState | null {
    return this.activeJob;
  }

  private setJobStage(stage: BackupStage, progressPercent: number, details?: Record<string, any>, errorMessage?: string) {
    if (!this.activeJob) return;
    this.activeJob.stage = stage;
    this.activeJob.progressPercent = progressPercent;
    this.activeJob.updatedAt = new Date().toISOString();
    if (details) this.activeJob.details = { ...this.activeJob.details, ...details };
    if (errorMessage) this.activeJob.errorMessage = errorMessage;
    console.log(`[BACKUP ENGINE] Job: ${this.activeJob.jobId} -> Stage: ${stage} (${progressPercent}%)`);
  }

  private releaseLock() {
    this.activeJob = null;
  }

  // -------------------------------------------------------------------------
  // HELPERS: DATE FORMATTING & TEMPORARY DIRECTORIES
  // -------------------------------------------------------------------------
  private getTimestampStrings(d: Date = new Date()) {
    // Formatted in configured timezone (default Asia/Kolkata)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ENV.BACKUP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(d);
    const mapping: Record<string, string> = {};
    for (const part of parts) {
      mapping[part.type] = part.value;
    }

    const yyyy = mapping.year;
    const mm = mapping.month;
    const dd = mapping.day;
    const hh = mapping.hour;
    const min = mapping.minute;
    const ss = mapping.second;

    const dateFolder = `${yyyy}-${mm}-${dd}`;
    const timeStamp = `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`;
    return { dateFolder, timeStamp, isoString: d.toISOString() };
  }

  private createTempDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), `3dgalaxy-backup-${prefix}-`));
  }

  private cleanupDir(dirPath: string) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[BACKUP ENGINE] Failed to remove temp directory ${dirPath}:`, err);
    }
  }

  // Calculate SHA-256 of file using streams (large database safe)
  private async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  // -------------------------------------------------------------------------
  // CORE: GET PUBLIC SCHEMA TABLE COUNT
  // -------------------------------------------------------------------------
  public async getPublicTableCount(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT count(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE';
      `;
      return Number(result[0]?.count || 0);
    } catch (err) {
      console.warn('[BACKUP ENGINE] Failed to query information_schema for table count:', err);
      return 0;
    }
  }

  // -------------------------------------------------------------------------
  // CREATE DATABASE BACKUP (MANUAL, SCHEDULED, OR PRE_RESTORE)
  // -------------------------------------------------------------------------
  public async createBackup(options: {
    type: 'MANUAL' | 'SCHEDULED' | 'PRE_RESTORE';
    createdBy?: string;
  }): Promise<{
    success: boolean;
    backupId: string;
    backupName: string;
    storagePath: string;
    fileSize: number;
    checksum: string;
    tableCount: number;
    durationMs: number;
    error?: string;
  }> {
    if (this.isBusy()) {
      throw new Error('A backup or restore operation is already in progress.');
    }

    const startTime = Date.now();
    const jobId = crypto.randomUUID();
    const { dateFolder, timeStamp } = this.getTimestampStrings();

    const isSafety = options.type === 'PRE_RESTORE';
    const backupName = isSafety
      ? `3dgalaxy-pre-restore-${timeStamp}.zip`
      : `3dgalaxy-db-backup-${timeStamp}.zip`;

    const storagePath = `${ENV.BACKUP_STORAGE_ROOT}/${dateFolder}/${backupName}`;
    const tempDir = this.createTempDir('dump');

    this.activeJob = {
      jobId,
      type: options.type,
      stage: 'PREPARING',
      progressPercent: 5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      backupName,
      details: { storagePath }
    };

    let dbRecordId: any = jobId;

    try {
      // Step 1: Create initial database log record
      try {
        const initialRecord = await prisma.databaseBackup.create({
          data: {
            id: jobId as any,
            backupName,
            storagePath,
            fileSize: BigInt(0),
            checksum: 'calculating...',
            tableCount: 0,
            backupType: options.type,
            status: 'RUNNING',
            createdBy: options.createdBy || (options.type === 'SCHEDULED' ? 'CRON_SCHEDULER' : 'SYSTEM'),
          }
        });
        dbRecordId = initialRecord.id;
      } catch (dbErr) {
        console.warn('[BACKUP ENGINE] Could not persist initial DB backup log record:', dbErr);
      }

      // Step 2: PostgreSQL dump (pg_dump)
      this.setJobStage('DUMPING', 25);
      const sqlDumpPath = path.join(tempDir, 'database.sql');

      await this.runPgDumpToFile(sqlDumpPath);

      if (!fs.existsSync(sqlDumpPath) || fs.statSync(sqlDumpPath).size === 0) {
        throw new Error('pg_dump produced an empty or missing SQL dump file.');
      }

      // Step 3: Compute SHA-256 checksum of SQL dump
      this.setJobStage('PACKAGING', 50);
      const checksum = await this.computeFileSha256(sqlDumpPath);
      const tableCount = await this.getPublicTableCount();

      // Step 4: Write manifest and checksum file
      const manifest: BackupManifest = {
        application: '3D Galaxy',
        backupType: options.type === 'PRE_RESTORE' ? 'PRE_RESTORE_SAFETY' : 'FULL_DATABASE',
        backupVersion: '1.0',
        createdAt: new Date().toISOString(),
        databaseType: 'PostgreSQL',
        databaseVersion: '17.6',
        tableCount,
        imageFilesIncluded: false,
        imageUrlsIncluded: true,
        storagePath,
        checksumAlgorithm: 'SHA-256',
        checksum,
      };

      const manifestPath = path.join(tempDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      const checksumPath = path.join(tempDir, 'sha256.txt');
      fs.writeFileSync(checksumPath, `${checksum}  database/database.sql\n`, 'utf-8');

      // Step 5: Package ZIP using Archiver
      const zipPath = path.join(tempDir, backupName);
      await this.packageZip(zipPath, sqlDumpPath, manifestPath, checksumPath);

      const zipStats = fs.statSync(zipPath);
      const fileSize = zipStats.size;

      // Step 6: Upload to Firebase Storage
      this.setJobStage('UPLOADING', 75, { fileSize });
      const bucket = getStorageBucket();
      if (!bucket) {
        throw new Error('Firebase Storage bucket is not available.');
      }

      await bucket.upload(zipPath, {
        destination: storagePath,
        metadata: {
          contentType: 'application/zip',
          metadata: {
            application: '3D Galaxy',
            backupType: options.type,
            tableCount: String(tableCount),
            checksum,
            createdAt: manifest.createdAt,
          }
        }
      });

      // Step 7: Verify uploaded file existence in Firebase
      this.setJobStage('VERIFYING', 90);
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Uploaded backup file could not be verified in Firebase Storage.');
      }

      const durationMs = Date.now() - startTime;

      // Step 8: Update database record to SUCCESS
      try {
        await prisma.databaseBackup.update({
          where: { id: dbRecordId },
          data: {
            fileSize: BigInt(fileSize),
            checksum,
            tableCount,
            status: 'SUCCESS',
            durationMs,
            manifest: manifest as any,
            verification: {
              status: 'VERIFIED',
              verifiedAt: new Date().toISOString(),
              remoteConfirmed: true
            }
          }
        });
      } catch (dbErr) {
        console.warn('[BACKUP ENGINE] Failed to update DB backup record on success:', dbErr);
      }

      // Step 9: Apply Retention Policy (keep latest N configured backups)
      if (options.type !== 'PRE_RESTORE') {
        this.applyRetentionPolicy().catch((retErr) => {
          console.warn('[BACKUP ENGINE] Retention cleanup error (non-fatal):', retErr);
        });
      }

      this.setJobStage('COMPLETED', 100, { durationMs, fileSize, checksum, tableCount });

      return {
        success: true,
        backupId: dbRecordId,
        backupName,
        storagePath,
        fileSize,
        checksum,
        tableCount,
        durationMs
      };
    } catch (error: any) {
      console.error('[BACKUP ENGINE] Backup failed:', error);
      const errorMessage = error?.message || String(error);
      this.setJobStage('FAILED', 0, undefined, errorMessage);

      try {
        await prisma.databaseBackup.update({
          where: { id: dbRecordId },
          data: {
            status: 'FAILED',
            errorMessage,
            durationMs: Date.now() - startTime
          }
        });
      } catch (dbErr) {
        // Ignore secondary error
      }

      throw error;
    } finally {
      this.cleanupDir(tempDir);
      this.releaseLock();
    }
  }

  // -------------------------------------------------------------------------
  // RUN PG_DUMP USING SPAWN DIRECTLY TO FILE (WITH NODE.JS PG FALLBACK)
  // -------------------------------------------------------------------------
  private async runPgDumpToFile(targetFilePath: string): Promise<void> {
    try {
      await this.runNativePgDump(targetFilePath);
    } catch (pgDumpErr: any) {
      console.warn('[BACKUP ENGINE] Native pg_dump unavailable or failed, switching to Node.js PostgreSQL dump engine:', pgDumpErr.message);
      await this.dumpDatabaseViaNodePg(targetFilePath);
    }
  }

  private runNativePgDump(targetFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', ENV.PG_HOST,
        '-p', String(ENV.PG_PORT),
        '-U', ENV.PG_USER,
        '-d', ENV.PG_DATABASE,
        '--schema=public',
        '--no-owner',
        '--no-privileges',
        '--file', targetFilePath
      ];

      const envVars = { ...process.env, PGPASSWORD: ENV.PG_PASSWORD };
      const child = spawn('pg_dump', args, { env: envVars, stdio: ['ignore', 'ignore', 'pipe'] });

      let stderr = '';
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with error code ${code}: ${stderr.trim()}`));
        }
      });
    });
  }

  private formatSqlLiteral(val: any, udtName?: string): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return 'NULL';
      return String(val);
    }
    if (val instanceof Date) {
      return `'${val.toISOString()}'::timestamptz`;
    }
    if (Array.isArray(val)) {
      if (udtName && udtName.startsWith('_')) {
        const escapedItems = val.map((item) => {
          if (item === null || item === undefined) return 'NULL';
          return `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        });
        return `'{${escapedItems.join(',')}}'`;
      }
      const jsonStr = JSON.stringify(val).replace(/'/g, "''");
      return `'${jsonStr}'::jsonb`;
    }
    if (typeof val === 'object') {
      if (Buffer.isBuffer(val)) {
        return `'\\x${val.toString('hex')}'::bytea`;
      }
      const jsonStr = JSON.stringify(val).replace(/'/g, "''");
      return `'${jsonStr}'::jsonb`;
    }
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
  }

  private async dumpDatabaseViaNodePg(targetFilePath: string): Promise<void> {
    const client = await pool.connect();
    const writeStream = fs.createWriteStream(targetFilePath, { encoding: 'utf-8' });

    const write = (text: string): Promise<void> => {
      if (!writeStream.write(text)) {
        return new Promise((resolve) => writeStream.once('drain', resolve));
      }
      return Promise.resolve();
    };

    try {
      await write(`-- 3D Galaxy Automated Database Dump (Native Node.js Engine)\n`);
      await write(`-- Generated at: ${new Date().toISOString()}\n\n`);
      await write(`SET statement_timeout = 0;\n`);
      await write(`SET lock_timeout = 0;\n`);
      await write(`SET client_encoding = 'UTF8';\n`);
      await write(`SET standard_conforming_strings = on;\n`);
      await write(`SET check_function_bodies = false;\n`);
      await write(`SET client_min_messages = warning;\n`);
      await write(`SET row_security = off;\n\n`);
      await write(`SET session_replication_role = 'replica';\n\n`);

      // 1. Enums
      const enumsRes = await client.query(`
        SELECT t.typname AS enum_name, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname;
      `);

      for (const row of enumsRes.rows) {
        await write(`DO $$ BEGIN\n  CREATE TYPE public."${row.enum_name}" AS ENUM (${row.enum_values});\nEXCEPTION\n  WHEN duplicate_object THEN null;\nEND $$;\n\n`);
      }

      // 2. All tables
      const tablesRes = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
      `);
      const tableNames: string[] = tablesRes.rows.map((r: any) => r.tablename);

      // 3. Columns metadata in one bulk query
      const allColsRes = await client.query(`
        SELECT 
          table_name,
          column_name, 
          data_type, 
          udt_name,
          is_nullable, 
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);

      const tableColumnsMap = new Map<string, any[]>();
      for (const col of allColsRes.rows) {
        if (!tableColumnsMap.has(col.table_name)) {
          tableColumnsMap.set(col.table_name, []);
        }
        tableColumnsMap.get(col.table_name)!.push(col);
      }

      // 4. Primary keys in one bulk query
      const allPkRes = await client.query(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.ordinal_position;
      `);

      const tablePkMap = new Map<string, string[]>();
      for (const pk of allPkRes.rows) {
        if (!tablePkMap.has(pk.table_name)) {
          tablePkMap.set(pk.table_name, []);
        }
        tablePkMap.get(pk.table_name)!.push(pk.column_name);
      }

      // 5. Stream table schemas and records
      for (const tableName of tableNames) {
        const cols = tableColumnsMap.get(tableName) || [];
        const pkCols = tablePkMap.get(tableName) || [];

        if (cols.length === 0) continue;

        const colDefs = cols.map((col: any) => {
          let typeStr = col.data_type;
          if (col.data_type === 'USER-DEFINED') {
            typeStr = `public."${col.udt_name}"`;
          } else if (col.data_type === 'ARRAY') {
            const base = col.udt_name.startsWith('_') ? col.udt_name.substring(1) : col.udt_name;
            typeStr = `public."${base}"[]`;
          } else if (col.data_type === 'character varying') {
            typeStr = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
          } else if (col.data_type === 'numeric') {
            typeStr = col.numeric_precision ? `NUMERIC(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})` : 'NUMERIC';
          }

          const nullableStr = col.is_nullable === 'NO' ? ' NOT NULL' : '';
          const defaultStr = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          return `"${col.column_name}" ${typeStr}${nullableStr}${defaultStr}`;
        });

        if (pkCols.length > 0) {
          colDefs.push(`CONSTRAINT "${tableName}_pkey" PRIMARY KEY (${pkCols.map((c: string) => `"${c}"`).join(', ')})`);
        }

        await write(`CREATE TABLE IF NOT EXISTS public."${tableName}" (\n  ${colDefs.join(',\n  ')}\n);\n\n`);
        await write(`TRUNCATE TABLE public."${tableName}" CASCADE;\n`);

        // Rows
        const rowsRes = await client.query(`SELECT * FROM public."${tableName}"`);
        const colNames = cols.map((c: any) => c.column_name);
        const colUdtMap = new Map(cols.map((c: any) => [c.column_name, c.udt_name]));

        if (rowsRes.rows.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < rowsRes.rows.length; i += batchSize) {
            const chunk = rowsRes.rows.slice(i, i + batchSize);
            const valuesSql = chunk.map((row: any) => {
              const vals = colNames.map((colName: string) => this.formatSqlLiteral(row[colName], colUdtMap.get(colName)));
              return `(${vals.join(', ')})`;
            }).join(',\n');

            await write(`INSERT INTO public."${tableName}" ("${colNames.join('", "')}") VALUES\n${valuesSql};\n\n`);
          }
        }
      }

      // 6. Sequences
      const seqRes = await client.query(`
        SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
      `);

      for (const seqRow of seqRes.rows) {
        try {
          const seqValRes = await client.query(`SELECT last_value, is_called FROM public."${seqRow.sequence_name}"`);
          if (seqValRes.rows.length > 0) {
            const { last_value, is_called } = seqValRes.rows[0];
            await write(`SELECT setval('public."${seqRow.sequence_name}"', ${last_value}, ${is_called});\n`);
          }
        } catch {}
      }

      await write(`\nSET session_replication_role = 'origin';\n`);

      await new Promise<void>((resolve, reject) => {
        writeStream.end((err: any) => err ? reject(err) : resolve());
      });
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // PACKAGE ZIP ARCHIVE
  // -------------------------------------------------------------------------
  private async packageZip(
    zipPath: string,
    sqlDumpPath: string,
    manifestPath: string,
    checksumPath: string
  ): Promise<void> {
    const zip = new AdmZip();
    zip.addLocalFile(sqlDumpPath, 'database', 'database.sql');
    zip.addLocalFile(manifestPath, 'metadata', 'manifest.json');
    zip.addLocalFile(checksumPath, 'checksum', 'sha256.txt');
    await zip.writeZipPromise(zipPath);
  }

  // -------------------------------------------------------------------------
  // VERIFY BACKUP INTEGRITY (SAFE: DOES NOT RESTORE TO DATABASE)
  // -------------------------------------------------------------------------
  public async verifyBackup(backupIdOrStoragePath: string): Promise<RestoreValidationResult> {
    const tempDir = this.createTempDir('verify');
    try {
      let storagePath = backupIdOrStoragePath;

      // Look up DB record if UUID provided
      if (!backupIdOrStoragePath.includes('/')) {
        const record = await prisma.databaseBackup.findUnique({
          where: { id: backupIdOrStoragePath }
        });
        if (record) {
          storagePath = record.storagePath;
        }
      }

      const bucket = getStorageBucket();
      if (!bucket) throw new Error('Firebase Storage bucket not configured.');

      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        return { valid: false, errorMessage: `Backup file not found in storage at ${storagePath}` };
      }

      const localZipPath = path.join(tempDir, 'verify.zip');
      await file.download({ destination: localZipPath });

      const zip = new AdmZip(localZipPath);
      const zipEntries = zip.getEntries();

      // Check expected file paths
      const entryNames = zipEntries.map((e) => e.entryName.replace(/\\/g, '/'));
      const hasSql = entryNames.some((n) => n === 'database/database.sql');
      const hasManifest = entryNames.some((n) => n === 'metadata/manifest.json');
      const hasChecksum = entryNames.some((n) => n === 'checksum/sha256.txt');

      if (!hasSql || !hasManifest || !hasChecksum) {
        return {
          valid: false,
          errorMessage: `Backup archive structure invalid. Expected database/database.sql, metadata/manifest.json, checksum/sha256.txt. Found: ${entryNames.join(', ')}`
        };
      }

      // Read manifest
      const manifestEntry = zip.getEntry('metadata/manifest.json');
      if (!manifestEntry) return { valid: false, errorMessage: 'Missing manifest.json' };

      const manifest: BackupManifest = JSON.parse(manifestEntry.getData().toString('utf-8'));

      // Extract SQL to temp disk and compute hash
      zip.extractEntryTo('database/database.sql', tempDir, false, true);
      const extractedSql = path.join(tempDir, 'database.sql');

      const computedHash = await this.computeFileSha256(extractedSql);

      const checksumMatches = computedHash.toLowerCase() === manifest.checksum.toLowerCase();
      if (!checksumMatches) {
        return {
          valid: false,
          checksumMatches: false,
          errorMessage: `SHA-256 checksum mismatch. Expected: ${manifest.checksum}, Computed: ${computedHash}`
        };
      }

      // Update database verification metadata if record exists
      try {
        await prisma.databaseBackup.updateMany({
          where: { storagePath },
          data: {
            verification: {
              status: 'VERIFIED',
              verifiedAt: new Date().toISOString(),
              checksumVerified: true,
              tableCount: manifest.tableCount,
            }
          }
        });
      } catch {
        // Non-critical
      }

      return {
        valid: true,
        checksumMatches: true,
        tableCount: manifest.tableCount,
        databaseVersion: manifest.databaseVersion,
        createdAt: manifest.createdAt,
        manifest
      };
    } catch (err: any) {
      return {
        valid: false,
        errorMessage: err?.message || 'Verification failed unexpectedly'
      };
    } finally {
      this.cleanupDir(tempDir);
    }
  }

  // -------------------------------------------------------------------------
  // RESTORE FROM BACKUP ZIP (STORAGE OR LOCAL UPLOAD)
  // -------------------------------------------------------------------------
  public async restoreBackup(options: {
    storagePath?: string;
    uploadedZipPath?: string;
    performedBy: string;
  }): Promise<{
    success: boolean;
    preRestoreSafetyBackupPath: string;
    healthCheck: HealthCheckResult;
    durationMs: number;
    error?: string;
  }> {
    if (this.isBusy()) {
      throw new Error('Another backup or restore operation is already in progress.');
    }

    const startTime = Date.now();
    const jobId = crypto.randomUUID();
    const tempDir = this.createTempDir('restore');

    this.activeJob = {
      jobId,
      type: 'RESTORE',
      stage: 'PREPARING',
      progressPercent: 5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      details: { performedBy: options.performedBy }
    };

    let safetyBackupPath = '';

    try {
      // Step 1: Resolve local ZIP file
      let localZipPath = options.uploadedZipPath;

      if (!localZipPath && options.storagePath) {
        this.setJobStage('PREPARING', 10, { message: 'Downloading backup from Firebase Storage' });
        const bucket = getStorageBucket();
        if (!bucket) throw new Error('Firebase Storage bucket not configured.');

        const file = bucket.file(options.storagePath);
        const [exists] = await file.exists();
        if (!exists) throw new Error(`Backup file ${options.storagePath} not found in Firebase Storage.`);

        localZipPath = path.join(tempDir, 'restore-target.zip');
        await file.download({ destination: localZipPath });
      }

      if (!localZipPath || !fs.existsSync(localZipPath)) {
        throw new Error('Target backup ZIP archive is missing or unreadable.');
      }

      // Step 2: Validate ZIP before touching anything
      this.setJobStage('VERIFYING', 20, { message: 'Verifying archive integrity and checksum' });
      const zip = new AdmZip(localZipPath);
      const zipEntries = zip.getEntries();

      // Security check: Only allow safe expected paths
      for (const entry of zipEntries) {
        const name = entry.entryName.replace(/\\/g, '/');
        const isAllowed =
          name === 'database/database.sql' ||
          name === 'metadata/manifest.json' ||
          name === 'checksum/sha256.txt' ||
          name === 'database/' ||
          name === 'metadata/' ||
          name === 'checksum/';
        if (!isAllowed) {
          throw new Error(`Untrusted file detected in backup archive: "${name}". Restore aborted.`);
        }
      }

      // Verify manifest
      const manifestEntry = zip.getEntry('metadata/manifest.json');
      if (!manifestEntry) throw new Error('manifest.json missing from backup ZIP.');
      const manifest: BackupManifest = JSON.parse(manifestEntry.getData().toString('utf-8'));

      if (manifest.databaseType !== 'PostgreSQL') {
        throw new Error(`Incompatible database type: "${manifest.databaseType}". Expected PostgreSQL.`);
      }

      // Extract SQL to temp disk
      const extractedSqlDir = path.join(tempDir, 'extracted');
      zip.extractAllTo(extractedSqlDir, true);
      const sqlFile = path.join(extractedSqlDir, 'database', 'database.sql');

      if (!fs.existsSync(sqlFile)) {
        throw new Error('database/database.sql was not found inside the backup archive.');
      }

      // Verify SHA-256
      const computedHash = await this.computeFileSha256(sqlFile);
      if (computedHash.toLowerCase() !== manifest.checksum.toLowerCase()) {
        throw new Error(`Integrity check failed: Checksum mismatch. (Archive: ${manifest.checksum}, Computed: ${computedHash})`);
      }

      // Step 3: MANDATORY PRE-RESTORE SAFETY BACKUP
      this.setJobStage('RESTORE_SAFETY_BACKUP', 35, { message: 'Generating pre-restore safety backup' });
      const safetyResult = await this.createPreRestoreSafetyBackup(options.performedBy);
      safetyBackupPath = safetyResult.storagePath;

      // Step 4: Execute Native PostgreSQL Restore via psql
      this.setJobStage('RESTORE_EXECUTING', 60, { message: 'Applying database dump via PostgreSQL psql' });
      await this.runPsqlFile(sqlFile);

      // Step 5: Reset PostgreSQL Sequences to prevent Duplicate Key errors
      this.setJobStage('RESTORE_EXECUTING', 80, { message: 'Synchronizing PostgreSQL identity and serial sequences' });
      await this.syncAllPostgresSequences();

      // Step 6: Reconnect Prisma Client
      this.setJobStage('RESTORE_HEALTH_CHECK', 90, { message: 'Reconnecting Prisma and running system health checks' });
      await prisma.$disconnect();
      clearSettingsCache();

      // Step 7: System Health Check
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`Post-restore health check failed: ${healthCheck.errors?.join('; ')}`);
      }

      const durationMs = Date.now() - startTime;
      this.setJobStage('RESTORE_COMPLETED', 100, { durationMs, safetyBackupPath, healthCheck });

      return {
        success: true,
        preRestoreSafetyBackupPath: safetyBackupPath,
        healthCheck,
        durationMs
      };
    } catch (err: any) {
      console.error('[BACKUP ENGINE] Restore failed:', err);
      const errorMessage = err?.message || String(err);
      this.setJobStage('RESTORE_FAILED', 0, { safetyBackupPath }, errorMessage);
      throw err;
    } finally {
      this.cleanupDir(tempDir);
      this.releaseLock();
    }
  }

  // -------------------------------------------------------------------------
  // RUN PSQL RESTORE (WITH NODE.JS PG FALLBACK)
  // -------------------------------------------------------------------------
  private async runPsqlFile(sqlFilePath: string): Promise<void> {
    try {
      await this.runNativePsql(sqlFilePath);
    } catch (psqlErr: any) {
      console.warn('[BACKUP ENGINE] Native psql CLI unavailable or failed, switching to Node.js PostgreSQL restore executor:', psqlErr.message);
      await this.restoreDatabaseViaNodePg(sqlFilePath);
    }
  }

  private runNativePsql(sqlFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', ENV.PG_HOST,
        '-p', String(ENV.PG_PORT),
        '-U', ENV.PG_USER,
        '-d', ENV.PG_DATABASE,
        '--single-transaction',
        '-v', 'ON_ERROR_STOP=1',
        '-f', sqlFilePath
      ];

      const envVars = { ...process.env, PGPASSWORD: ENV.PG_PASSWORD };
      const child = spawn('psql', args, { env: envVars });

      let stderr = '';
      child.stderr?.on('data', (d) => { stderr += d.toString(); });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn psql: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // If --single-transaction fails or has specific notices, report
          reject(new Error(`psql restore failed with exit code ${code}: ${stderr.trim()}`));
        }
      });
    });
  }

  private async restoreDatabaseViaNodePg(sqlFilePath: string): Promise<void> {
    const client = await pool.connect();
    try {
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Node.js PostgreSQL restore failed: ${err.message}`);
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // POST-RESTORE SEQUENCE INTEGRITY SYNCHRONIZER
  // -------------------------------------------------------------------------
  public async syncAllPostgresSequences(): Promise<void> {
    try {
      // Find all sequences in schema public and reset them to max id
      const sql = `
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN
            SELECT
              t.relname AS table_name,
              a.attname AS column_name,
              s.relname AS sequence_name
            FROM pg_class s
            JOIN pg_depend d ON d.objid = s.oid
            JOIN pg_class t ON d.refobjid = t.oid
            JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (t.oid, a.attnum)
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE s.relkind = 'S'
              AND n.nspname = 'public'
          LOOP
            EXECUTE format('SELECT setval(quote_ident(%L), COALESCE((SELECT MAX(%I) FROM %I), 1))',
              r.sequence_name, r.column_name, r.table_name);
          END LOOP;
        END $$;
      `;
      await prisma.$executeRawUnsafe(sql);
      console.log('[BACKUP ENGINE] All PostgreSQL sequences synchronized successfully.');
    } catch (seqErr) {
      console.warn('[BACKUP ENGINE] Warning: sequence synchronization query warning:', seqErr);
    }
  }

  // -------------------------------------------------------------------------
  // PRE-RESTORE SAFETY BACKUP HELPER
  // -------------------------------------------------------------------------
  private async createPreRestoreSafetyBackup(performedBy: string) {
    // Temporarily bypass activeJob flag check for the nested safety backup
    const prevJob = this.activeJob;
    this.activeJob = null;

    try {
      const result = await this.createBackup({
        type: 'PRE_RESTORE',
        createdBy: performedBy
      });
      return result;
    } finally {
      this.activeJob = prevJob;
    }
  }

  // -------------------------------------------------------------------------
  // SYSTEM HEALTH CHECK
  // -------------------------------------------------------------------------
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const errors: string[] = [];

    try {
      const [
        users,
        customers,
        categories,
        products,
        productVariants,
        orders,
        orderItems,
        reviews,
        banners,
        whatsappMessages,
        themeSettings
      ] = await Promise.all([
        prisma.user.count().catch((e) => { errors.push(`users: ${e.message}`); return 0; }),
        prisma.customer.count().catch((e) => { errors.push(`customers: ${e.message}`); return 0; }),
        prisma.category.count().catch((e) => { errors.push(`categories: ${e.message}`); return 0; }),
        prisma.product.count().catch((e) => { errors.push(`products: ${e.message}`); return 0; }),
        prisma.productVariant.count().catch((e) => { errors.push(`productVariants: ${e.message}`); return 0; }),
        prisma.order.count().catch((e) => { errors.push(`orders: ${e.message}`); return 0; }),
        prisma.orderItem.count().catch((e) => { errors.push(`orderItems: ${e.message}`); return 0; }),
        prisma.productReview.count().catch((e) => { errors.push(`reviews: ${e.message}`); return 0; }),
        prisma.banner.count().catch((e) => { errors.push(`banners: ${e.message}`); return 0; }),
        prisma.whatsappMessage.count().catch((e) => { errors.push(`whatsappMessages: ${e.message}`); return 0; }),
        prisma.themeSetting.count().catch((e) => { errors.push(`themeSettings: ${e.message}`); return 0; }),
      ]);

      // Check relationships
      let productVariantsLinked = true;
      if (productVariants > 0) {
        const orphanVariants = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
          SELECT count(*)::int as count 
          FROM public.product_variants pv
          LEFT JOIN public.products p ON p.id = pv.product_id
          WHERE p.id IS NULL;
        `.catch(() => [{ count: 0 }]);
        if (Number(orphanVariants[0]?.count || 0) > 0) {
          productVariantsLinked = false;
          errors.push('Found orphaned product variants without products.');
        }
      }

      let orderItemsLinked = true;
      if (orderItems > 0) {
        const orphanItems = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
          SELECT count(*)::int as count 
          FROM public.order_items oi
          LEFT JOIN public.orders o ON o.id = oi.order_id
          WHERE o.id IS NULL;
        `.catch(() => [{ count: 0 }]);
        if (Number(orphanItems[0]?.count || 0) > 0) {
          orderItemsLinked = false;
          errors.push('Found orphaned order items without orders.');
        }
      }

      let customerOrdersLinked = true;
      if (orders > 0) {
        const orphanOrders = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
          SELECT count(*)::int as count 
          FROM public.orders o
          LEFT JOIN public.customers c ON c.id = o.customer_id
          WHERE o.customer_id IS NOT NULL AND c.id IS NULL;
        `.catch(() => [{ count: 0 }]);
        if (Number(orphanOrders[0]?.count || 0) > 0) {
          customerOrdersLinked = false;
          errors.push('Found orphaned orders without customer records.');
        }
      }

      const healthy = errors.length === 0;

      return {
        healthy,
        databaseConnected: true,
        timestamp: new Date().toISOString(),
        counts: {
          users,
          customers,
          categories,
          products,
          productVariants,
          orders,
          orderItems,
          reviews,
          banners,
          whatsappMessages,
          themeSettings
        },
        checks: {
          productVariantsLinked,
          orderItemsLinked,
          customerOrdersLinked
        },
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      return {
        healthy: false,
        databaseConnected: false,
        timestamp: new Date().toISOString(),
        counts: {
          users: 0, customers: 0, categories: 0, products: 0,
          productVariants: 0, orders: 0, orderItems: 0, reviews: 0,
          banners: 0, whatsappMessages: 0, themeSettings: 0
        },
        checks: {
          productVariantsLinked: false,
          orderItemsLinked: false,
          customerOrdersLinked: false
        },
        errors: [err?.message || 'Database health check failed']
      };
    }
  }

  // -------------------------------------------------------------------------
  // SECURE BACKEND DOWNLOAD STREAM
  // -------------------------------------------------------------------------
  public async getDownloadStream(backupId: string): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    fileSize: number;
    contentType: string;
  }> {
    let storagePath = backupId;

    if (!backupId.includes('/')) {
      const record = await prisma.databaseBackup.findUnique({
        where: { id: backupId }
      });
      if (record) {
        storagePath = record.storagePath;
      }
    }

    const bucket = getStorageBucket();
    if (!bucket) throw new Error('Firebase Storage bucket not configured.');

    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new Error(`Backup file not found in storage at ${storagePath}`);

    const [metadata] = await file.getMetadata();
    const fileName = path.basename(storagePath);
    const fileSize = Number(metadata.size || 0);

    return {
      stream: file.createReadStream(),
      fileName,
      fileSize,
      contentType: 'application/zip'
    };
  }

  // -------------------------------------------------------------------------
  // RETENTION POLICY ENFORCER
  // -------------------------------------------------------------------------
  public async applyRetentionPolicy(): Promise<{ deletedCount: number }> {
    const keepCount = Math.max(1, ENV.BACKUP_RETENTION_COUNT);
    const bucket = getStorageBucket();
    if (!bucket) return { deletedCount: 0 };

    try {
      // Find all successful MANUAL and SCHEDULED backups (exclude PRE_RESTORE safety backups)
      const backups = await prisma.databaseBackup.findMany({
        where: {
          status: 'SUCCESS',
          backupType: { in: ['MANUAL', 'SCHEDULED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (backups.length <= keepCount) {
        return { deletedCount: 0 };
      }

      const backupsToDelete = backups.slice(keepCount);
      let deletedCount = 0;

      for (const b of backupsToDelete) {
        try {
          const file = bucket.file(b.storagePath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }

          await prisma.databaseBackup.delete({
            where: { id: b.id }
          });
          deletedCount++;
          console.log(`[BACKUP ENGINE] Retention: Deleted old backup ${b.backupName} (${b.storagePath})`);
        } catch (err) {
          console.warn(`[BACKUP ENGINE] Retention: Failed to delete ${b.storagePath}:`, err);
        }
      }

      return { deletedCount };
    } catch (err) {
      console.warn('[BACKUP ENGINE] Error applying retention policy:', err);
      return { deletedCount: 0 };
    }
  }

  // -------------------------------------------------------------------------
  // BACKUP HISTORY (MERGES DB RECORDS + DIRECT FIREBASE STORAGE DISCOVERY)
  // -------------------------------------------------------------------------
  public async getBackupHistory(page = 1, limit = 20): Promise<{
    data: any[];
    totalCount: number;
    totalSizeBytes: number;
    lastSuccessfulBackup: any | null;
    isOverdue: boolean;
    overdueDays: number;
  }> {
    let dbRecords: any[] = [];
    let totalCount = 0;

    try {
      const skip = (page - 1) * limit;
      [dbRecords, totalCount] = await Promise.all([
        prisma.databaseBackup.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.databaseBackup.count()
      ]);
    } catch (dbErr) {
      console.warn('[BACKUP ENGINE] DB records lookup failed, scanning Firebase Storage directly:', dbErr);
    }

    // If database was lost or empty, discover existing backups from Firebase Storage
    if (dbRecords.length === 0) {
      const bucket = getStorageBucket();
      if (bucket) {
        try {
          const [files] = await bucket.getFiles({ prefix: `${ENV.BACKUP_STORAGE_ROOT}/` });
          const zipFiles = files.filter((f: any) => f.name.endsWith('.zip'));

          totalCount = zipFiles.length;
          dbRecords = zipFiles
            .sort((a: any, b: any) => new Date(b.metadata.timeCreated).getTime() - new Date(a.metadata.timeCreated).getTime())
            .slice((page - 1) * limit, page * limit)
            .map((f: any) => ({
              id: f.name,
              backupName: path.basename(f.name),
              storagePath: f.name,
              fileSize: BigInt(f.metadata.size || 0),
              checksum: f.metadata.metadata?.checksum || 'stored-in-manifest',
              tableCount: Number(f.metadata.metadata?.tableCount || 0),
              backupType: f.name.includes('pre-restore') ? 'PRE_RESTORE' : 'MANUAL',
              status: 'SUCCESS',
              durationMs: 0,
              manifest: null,
              verification: { status: 'CLOUD_DISCOVERED' },
              createdBy: 'REMOTE_STORAGE',
              createdAt: new Date(f.metadata.timeCreated),
              updatedAt: new Date(f.metadata.updated || f.metadata.timeCreated)
            }));
        } catch (storageErr) {
          console.error('[BACKUP ENGINE] Remote storage listing error:', storageErr);
        }
      }
    }

    // Convert BigInt to number/string for JSON serialization
    const formattedData = dbRecords.map((r) => ({
      ...r,
      fileSize: typeof r.fileSize === 'bigint' ? Number(r.fileSize) : r.fileSize,
    }));

    // Find latest successful backup
    let lastSuccessful = formattedData.find((b) => b.status === 'SUCCESS' && b.backupType !== 'PRE_RESTORE') || null;

    if (!lastSuccessful && formattedData.length > 0) {
      lastSuccessful = formattedData.find((b) => b.status === 'SUCCESS') || null;
    }

    let isOverdue = false;
    let overdueDays = 0;

    if (lastSuccessful) {
      const lastDate = new Date(lastSuccessful.createdAt).getTime();
      const diffDays = Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
      overdueDays = diffDays;
      if (diffDays >= 7) {
        isOverdue = true;
      }
    } else {
      isOverdue = true;
      overdueDays = 999;
    }

    const totalSizeBytes = formattedData.reduce((acc, cur) => acc + (cur.fileSize || 0), 0);

    return {
      data: formattedData,
      totalCount,
      totalSizeBytes,
      lastSuccessfulBackup: lastSuccessful,
      isOverdue,
      overdueDays
    };
  }
}

export const backupEngine = new BackupEngineService();
export default backupEngine;
