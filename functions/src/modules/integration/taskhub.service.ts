import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import prisma, { pool, isPoolHealthy } from '../../config/database';
import { ENV } from '../../config/env';
import { getStorageBucket, getFirebaseAdmin } from '../../config/firebase';
import { logger, maskSensitiveData } from '../../utils/logger';
import { sysCache } from '../../config/cache';
import backupEngine from '../../services/backupEngine.service';
import backupScheduler from '../../services/backupScheduler.service';
import { trafficTracker } from './trafficTracker';
import {
  TaskHubHealthData,
  TaskHubMetricsData,
  TaskHubTrafficBucket,
  TaskHubDeploymentRecord,
  TaskHubDiagnosticsData,
} from './taskhub.types';

// Baseline state for CPU tracking
let lastCpuSampleTime = Date.now();
let lastCpuUsage = process.cpuUsage();

export class TaskHubService {
  /**
   * Discovers all possible log directory locations
   */
  private getPossibleLogDirs(): string[] {
    return [
      process.env.LOG_DIR || '',
      path.resolve(process.cwd(), 'logs'),
      path.resolve(process.cwd(), 'functions/logs'),
      path.resolve(__dirname, '../../../logs'),
      path.resolve(__dirname, '../../logs'),
    ].filter((dir) => dir && fs.existsSync(dir));
  }

  /**
   * Calculates actual process CPU utilization percentage over interval
   */
  private getCpuUtilization() {
    const now = Date.now();
    const timeDiffMs = Math.max(1, now - lastCpuSampleTime);
    const cpuDiff = process.cpuUsage(lastCpuUsage);

    lastCpuSampleTime = now;
    lastCpuUsage = process.cpuUsage();

    const numCpus = Math.max(1, os.cpus().length);
    // (diff in microseconds / 1000) = ms of CPU time consumed
    const userPercent = Number(((cpuDiff.user / 1000 / timeDiffMs) * 100 / numCpus).toFixed(2));
    const systemPercent = Number(((cpuDiff.system / 1000 / timeDiffMs) * 100 / numCpus).toFixed(2));
    const cpuPercent = Number((userPercent + systemPercent).toFixed(2));

    return {
      userMicroseconds: cpuDiff.user,
      systemMicroseconds: cpuDiff.system,
      totalMicroseconds: cpuDiff.user + cpuDiff.system,
      cpuPercent,
      userPercent,
      systemPercent,
    };
  }

  /**
   * Reads host disk metrics if supported by runtime (fs.statfsSync), else returns null
   */
  private getDiskMetrics() {
    try {
      if (typeof (fs as any).statfsSync === 'function') {
        const stat = (fs as any).statfsSync(process.cwd());
        const bsize = Number(stat.bsize || 4096);
        const blocks = Number(stat.blocks || 0);
        const bfree = Number(stat.bfree || 0);
        const bavail = Number(stat.bavail || 0);

        const totalBytes = bsize * blocks;
        const freeBytes = bsize * bfree;
        const availableBytes = bsize * bavail;
        const usedBytes = totalBytes - freeBytes;
        const percentUsed = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : null;

        return {
          totalBytes,
          freeBytes,
          availableBytes,
          usedBytes,
          percentUsed,
          unit: 'bytes',
          source: 'fs.statfsSync',
        };
      }
    } catch {
      // In restricted sandbox/serverless environments, statfs might not be accessible
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 1. HEALTH (GET /api/integration/v1/health)
  // ---------------------------------------------------------------------------
  public async getHealth(): Promise<TaskHubHealthData> {
    const cacheKey = 'taskhub_health_cache';
    const cached = sysCache.get(cacheKey);
    if (cached) {
      return { ...cached, timestamp: new Date().toISOString() };
    }

    const timestamp = new Date().toISOString();
    let dbStatus: 'HEALTHY' | 'UNHEALTHY' = 'HEALTHY';
    let dbLatencyMs = 0;
    let firebaseStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    let storageStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    let backupStatus: 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'BUSY' = 'HEALTHY';

    // 1A. Database Check & Latency Timing
    const dbStart = Date.now();
    try {
      const poolOk = await isPoolHealthy();
      if (!poolOk) {
        dbStatus = 'UNHEALTHY';
      } else {
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
        dbStatus = 'HEALTHY';
      }
    } catch {
      dbStatus = 'UNHEALTHY';
      dbLatencyMs = Date.now() - dbStart;
    }

    // 1B. Firebase Auth Check
    try {
      const fbAdmin = getFirebaseAdmin();
      if (fbAdmin.apps && fbAdmin.apps.length > 0) {
        firebaseStatus = 'CONNECTED';
      }
    } catch {
      firebaseStatus = 'DISCONNECTED';
    }

    // 1C. Storage Bucket Check
    try {
      const bucket = getStorageBucket();
      if (bucket) {
        storageStatus = 'CONNECTED';
      }
    } catch {
      storageStatus = 'DISCONNECTED';
    }

    // 1D. Backup Service Check
    try {
      if (!ENV.BACKUP_MODULE_ENABLED) {
        backupStatus = 'DISABLED';
      } else if (backupEngine.isBusy()) {
        backupStatus = 'BUSY';
      } else {
        backupStatus = 'HEALTHY';
      }
    } catch {
      backupStatus = 'DEGRADED';
    }

    const isSystemHealthy =
      dbStatus === 'HEALTHY' &&
      firebaseStatus === 'CONNECTED' &&
      storageStatus === 'CONNECTED' &&
      backupStatus !== 'DEGRADED';

    const healthData: TaskHubHealthData = {
      application: {
        name: ENV.SITE_NAME || '3D Galaxy Storefront Backend',
        version: '1.0.0',
        environment: ENV.TASKHUB_ENVIRONMENT || 'production',
        nodeId: `${os.hostname()}:${process.pid}`,
        pid: process.pid,
      },
      status: isSystemHealthy ? 'HEALTHY' : dbStatus === 'UNHEALTHY' ? 'UNHEALTHY' : 'DEGRADED',
      isHealthy: isSystemHealthy,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp,
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        firebase: {
          status: firebaseStatus,
        },
        storage: {
          status: storageStatus,
        },
        backupScheduler: {
          status: backupStatus,
          enabled: ENV.BACKUP_MODULE_ENABLED,
          schedule: backupScheduler.getCronExpression().description,
        },
      },
    };

    // Cache for 5 seconds to prevent spam
    sysCache.set(cacheKey, healthData, 5);
    return healthData;
  }

  // ---------------------------------------------------------------------------
  // 2. RUNTIME METRICS (GET /api/integration/v1/metrics)
  // ---------------------------------------------------------------------------
  public async getMetrics(): Promise<TaskHubMetricsData> {
    const cacheKey = 'taskhub_metrics_cache';
    const cached = sysCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        collection: {
          ...cached.collection,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Process and System CPU Measurements
    const cpuUtil = this.getCpuUtilization();
    const loadAvg = os.loadavg();
    const cpus = os.cpus();

    // 2. Memory Measurements
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // 3. Disk Measurements (genuinely measured if supported)
    const disk = this.getDiskMetrics();

    // 4. Traffic & Request Measurements
    const trafficSummary = trafficTracker.getTrafficSummary(5);

    // 5. Database Connection & Connection Pool Statistics
    let dbConnected = false;
    let dbLatencyMs = 0;
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      dbConnected = true;
    } catch {
      dbConnected = false;
      dbLatencyMs = Date.now() - dbStart;
    }

    const poolTotal = pool.totalCount || 0;
    const poolIdle = pool.idleCount || 0;
    const poolWaiting = pool.waitingCount || 0;
    const poolActive = Math.max(0, poolTotal - poolIdle);
    const poolMax = (pool as any).options?.max || ENV.PG_POOL_MAX || 10;

    // 6. Background Job Health
    let backupStatus = 'HEALTHY';
    if (!ENV.BACKUP_MODULE_ENABLED) {
      backupStatus = 'DISABLED';
    } else if (backupEngine.isBusy()) {
      backupStatus = 'BUSY';
    }

    const metricsData: TaskHubMetricsData = {
      application: {
        availability: dbConnected,
        uptimeSeconds: Math.floor(process.uptime()),
        bootTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        version: '1.0.0',
      },
      cpu: {
        process: {
          userMicroseconds: cpuUtil.userMicroseconds,
          systemMicroseconds: cpuUtil.systemMicroseconds,
          totalMicroseconds: cpuUtil.totalMicroseconds,
          cpuPercent: cpuUtil.cpuPercent,
          userPercent: cpuUtil.userPercent,
          systemPercent: cpuUtil.systemPercent,
        },
        system: {
          loadAvg1m: Number(loadAvg[0]?.toFixed(2) || 0),
          loadAvg5m: Number(loadAvg[1]?.toFixed(2) || 0),
          loadAvg15m: Number(loadAvg[2]?.toFixed(2) || 0),
          cpuCount: cpus.length,
          model: cpus[0]?.model || 'Generic Host CPU',
        },
      },
      memory: {
        process: {
          rssBytes: mem.rss,
          heapTotalBytes: mem.heapTotal,
          heapUsedBytes: mem.heapUsed,
          externalBytes: mem.external,
          arrayBuffersBytes: mem.arrayBuffers || 0,
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        system: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          totalMb: Math.round(totalMem / 1024 / 1024),
          freeMb: Math.round(freeMem / 1024 / 1024),
          usedMb: Math.round(usedMem / 1024 / 1024),
          usedPercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
        },
      },
      disk,
      network: {
        processHttp: {
          totalBytesIn: trafficSummary.totalHttpBytesIn,
          totalBytesOut: trafficSummary.totalHttpBytesOut,
          totalRequests: trafficSummary.totalHttpRequests,
        },
        hostThroughput: null, // Host-level network metrics require privileged container access
      },
      traffic: {
        requestRatePerSecond: trafficSummary.requestRatePerSecond,
        requestRatePerMinute: trafficSummary.requestRatePerMinute,
        avgLatencyMs: trafficSummary.avgLatencyMs,
        p50LatencyMs: trafficSummary.p50LatencyMs,
        p95LatencyMs: trafficSummary.p95LatencyMs,
        p99LatencyMs: trafficSummary.p99LatencyMs,
        totalRequests5m: trafficSummary.totalRequests5m,
        clientErrorRatePercent: trafficSummary.clientErrorRatePercent,
        serverErrorRatePercent: trafficSummary.serverErrorRatePercent,
        totalErrors5m: trafficSummary.totalErrors5m,
      },
      database: {
        connected: dbConnected,
        latencyMs: dbLatencyMs,
        pool: {
          totalConnections: poolTotal,
          idleConnections: poolIdle,
          activeConnections: poolActive,
          waitingRequests: poolWaiting,
          maxConnections: poolMax,
        },
      },
      backgroundJobs: {
        backupScheduler: {
          enabled: ENV.BACKUP_MODULE_ENABLED,
          isBusy: backupEngine.isBusy(),
          status: backupStatus,
          schedule: backupScheduler.getCronExpression().description,
        },
        fcmNotifications: {
          enabled: ENV.FCM_NOTIFICATIONS_ENABLED,
          projectId: ENV.FIREBASE_PROJECT_ID,
        },
      },
      deployment: {
        applicationId: ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
        version: '1.0.0',
        environment: ENV.TASKHUB_ENVIRONMENT || 'production',
        commitSha: process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
        buildRevision: process.env.K_REVISION || null,
        nodeVersion: process.version,
        processId: process.pid,
        platform: process.platform,
        arch: process.arch,
      },
      collection: {
        timestamp,
        sources: ['process', 'os', 'pg.Pool', 'trafficTracker', 'backupEngine'],
        limitations: [
          'Process-level metrics reflect the active Node.js server instance.',
          'Host network throughput is null because host-level network counters require privileged OS container capabilities.',
        ],
      },
    };

    sysCache.set(cacheKey, metricsData, 5);
    return metricsData;
  }

  // ---------------------------------------------------------------------------
  // 3. LOGS (GET /api/integration/v1/logs)
  // ---------------------------------------------------------------------------
  public async getLogs(filter: {
    page?: number;
    limit?: number;
    date?: string;
    from?: string;
    to?: string;
    level?: string;
    module?: string;
    search?: string;
    requestId?: string;
    errorCode?: string;
  }): Promise<{ logs: any[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const page = Math.max(1, Number(filter.page || 1));
    const limit = Math.min(200, Math.max(1, Number(filter.limit || 50)));

    const logDirs = this.getPossibleLogDirs();
    if (logDirs.length === 0) {
      return { logs: [], total: 0, page, limit, hasMore: false };
    }

    const targetDate = filter.date ? String(filter.date) : undefined;
    const fromTime = filter.from ? new Date(filter.from).getTime() : undefined;
    const toTime = filter.to ? new Date(filter.to).getTime() : undefined;
    const levelStr = filter.level ? filter.level.toUpperCase() : undefined;
    const moduleStr = filter.module ? filter.module.toUpperCase() : undefined;
    const searchStr = filter.search ? filter.search.toLowerCase() : undefined;
    const reqIdStr = filter.requestId ? filter.requestId.trim() : undefined;
    const errCodeStr = filter.errorCode ? filter.errorCode.trim().toUpperCase() : undefined;

    // Collect all candidate log files
    const logFiles: string[] = [];
    for (const dir of logDirs) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.endsWith('.log')) continue;
          if (targetDate && !file.includes(targetDate)) continue;
          logFiles.push(path.join(dir, file));
        }
      } catch {
        // Skip inaccessible dirs
      }
    }

    if (logFiles.length === 0) {
      return { logs: [], total: 0, page, limit, hasMore: false };
    }

    const matchedEntries: any[] = [];

    // Stream files line by line
    for (const filePath of logFiles) {
      try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);

            if (levelStr && entry.level !== levelStr) continue;
            if (moduleStr && entry.module !== moduleStr) continue;
            if (reqIdStr && entry.requestId !== reqIdStr) continue;
            if (errCodeStr && entry.errorCode !== errCodeStr) continue;

            if (fromTime || toTime) {
              const entryTime = new Date(entry.timestamp).getTime();
              if (fromTime && entryTime < fromTime) continue;
              if (toTime && entryTime > toTime) continue;
            }

            if (searchStr) {
              const lineLower = line.toLowerCase();
              if (!lineLower.includes(searchStr)) continue;
            }

            matchedEntries.push(maskSensitiveData(entry));
          } catch {
            // Ignore malformed lines
          }
        }
      } catch (fileErr) {
        logger.warn(`[TASKHUB LOGS] Warning: Error reading file ${filePath}:`, { error: String(fileErr) });
      }
    }

    // Sort descending by timestamp (newest first)
    matchedEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = matchedEntries.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = matchedEntries.slice(startIndex, startIndex + limit);

    return {
      logs: paginatedLogs,
      total,
      page,
      limit,
      hasMore: startIndex + limit < total,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. TRAFFIC (GET /api/integration/v1/traffic)
  // ---------------------------------------------------------------------------
  public getTraffic(query: {
    window?: string;
    from?: string;
    to?: string;
    endpoint?: string;
    method?: string;
    statusCode?: string | number;
    page?: number;
    limit?: number;
  }) {
    return trafficTracker.getTrafficMetrics(query);
  }

  // ---------------------------------------------------------------------------
  // 5. DEPLOYMENTS (GET /api/integration/v1/deployments)
  // ---------------------------------------------------------------------------
  public getDeployments(): { deployments: TaskHubDeploymentRecord[]; total: number } {
    const uptimeSec = Math.floor(process.uptime());
    const deployedAt =
      process.env.DEPLOYMENT_TIMESTAMP ||
      new Date(Date.now() - uptimeSec * 1000).toISOString();

    const activeDeployment: TaskHubDeploymentRecord = {
      deploymentId: process.env.K_REVISION || process.env.GIT_COMMIT_SHA || 'v1.0.0',
      applicationId: ENV.TASKHUB_APPLICATION_ID || '3dgalaxy',
      environment: ENV.TASKHUB_ENVIRONMENT || 'production',
      version: '1.0.0',
      commitSha: process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
      branch: process.env.GIT_BRANCH || 'main',
      deployedAt,
      status: 'ACTIVE',
      runtime: `Node.js ${process.version}`,
      platform: process.env.K_SERVICE ? 'Google Cloud Run / Firebase' : 'Node.js Express Server',
      uptimeSeconds: uptimeSec,
      healthStatus: 'HEALTHY',
    };

    return {
      deployments: [activeDeployment],
      total: 1,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. RESTRICTED READ-ONLY DIAGNOSTICS (GET /api/integration/v1/diagnostics)
  // ---------------------------------------------------------------------------
  public async getDiagnostics(): Promise<TaskHubDiagnosticsData> {
    const health = await this.getHealth();
    const metrics = await this.getMetrics();
    const logsResult = await this.getLogs({ page: 1, limit: 15, level: 'ERROR' });
    const deploymentsResult = this.getDeployments();

    return {
      applicationHealth: health,
      processStatus: {
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      resourceUtilization: {
        cpuPercent: metrics.cpu.process.cpuPercent,
        memoryUsedMb: metrics.memory.process.heapUsedMb,
        memoryTotalMb: metrics.memory.process.heapTotalMb,
        memoryPercent: metrics.memory.system.usedPercent,
        diskPercentUsed: metrics.disk?.percentUsed ?? null,
      },
      databaseConnectivity: metrics.database,
      recentLogs: logsResult.logs.map((l) => ({
        timestamp: l.timestamp,
        level: l.level,
        message: l.message,
        module: l.module,
        errorCode: l.errorCode,
      })),
      recentDeployments: deploymentsResult.deployments,
      readOnly: true,
    };
  }
}

export const taskhubService = new TaskHubService();
export default taskhubService;
