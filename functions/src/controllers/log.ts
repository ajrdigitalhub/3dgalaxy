import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import prisma from '../config/database';
import { logger, maskSensitiveData } from '../utils/logger';

/**
 * Endpoint POST /api/logs/client
 * Ingest unhandled Angular frontend errors and breadcrumbs
 */
export const handleClientLog = async (req: Request, res: Response) => {
  try {
    const { level, message, requestId, route, feature, action, statusCode, metadata, breadcrumbs, stack } = req.body;

    const logLevel = (level || 'ERROR').toUpperCase();
    const safeMeta = metadata ? maskSensitiveData(metadata) : {};
    const safeBreadcrumbs = Array.isArray(breadcrumbs) ? maskSensitiveData(breadcrumbs) : [];

    const context = {
      requestId: requestId || req.requestId,
      route: route || 'client-side',
      method: 'CLIENT',
      statusCode: statusCode || 500,
      module: feature ? String(feature).toUpperCase() : 'FRONTEND',
      metadata: {
        action: action || 'unhandled-error',
        ...safeMeta,
        breadcrumbs: safeBreadcrumbs
      }
    };

    if (logLevel === 'WARN') {
      logger.warn(`[Client] ${message || 'Frontend Warning'}`, context, {
        errorCode: 'CLIENT_WARN',
        module: context.module
      });
    } else {
      logger.error(`[Client] ${message || 'Frontend Unhandled Error'}`, stack ? { stack, message } : undefined, context, {
        errorCode: 'CLIENT_ERROR',
        module: context.module,
        errorStack: stack
      });
    }

    return res.status(200).json({ success: true, message: 'Client log ingested successfully' });
  } catch (error: any) {
    logger.error('Failed to ingest client log:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Endpoint GET /api/health
 * Comprehensive health check for application, database, system uptime
 */
export const handleHealthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'DISCONNECTED';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'CONNECTED';
  } catch (err: any) {
    dbStatus = `ERROR: ${err.message || 'Connection failed'}`;
    logger.error('Database health check failed', err, { module: 'HEALTH' });
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbStatus === 'CONNECTED';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    service: '3dgalaxy-backend',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    system: {
      uptimeSeconds,
      memoryUsageMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    latencyMs: Date.now() - startTime
  });
};

/**
 * Endpoint GET /api/admin/logs
 * Read and search structured log files line-by-line with pagination
 */
export const handleGetAdminLogs = async (req: Request, res: Response) => {
  try {
    const {
      level,
      module: moduleFilter,
      date,
      search,
      requestId,
      orderId,
      errorCode,
      page = 1,
      limit = 50
    } = req.query;

    const logsDir = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      return res.status(200).json({ success: true, logs: [], total: 0, page: 1, limit: Number(limit) });
    }

    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    const logFiles = fs.readdirSync(logsDir).filter(f => f.includes(targetDate) && f.endsWith('.log'));

    if (logFiles.length === 0) {
      return res.status(200).json({ success: true, logs: [], total: 0, page: 1, limit: Number(limit) });
    }

    const matchedEntries: any[] = [];

    const levelStr = level ? String(level).toUpperCase() : null;
    const moduleStr = moduleFilter ? String(moduleFilter).toUpperCase() : null;
    const searchStr = search ? String(search).toLowerCase() : null;
    const reqIdStr = requestId ? String(requestId).trim() : null;
    const ordIdStr = orderId ? String(orderId).trim().toLowerCase() : null;
    const errCodeStr = errorCode ? String(errorCode).trim().toUpperCase() : null;

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
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

          if (ordIdStr) {
            const entryText = JSON.stringify(entry).toLowerCase();
            if (!entryText.includes(ordIdStr)) continue;
          }

          if (searchStr) {
            const entryText = JSON.stringify(entry).toLowerCase();
            if (!entryText.includes(searchStr)) continue;
          }

          matchedEntries.push(entry);
        } catch { }
      }
    }

    // Sort descending by timestamp
    matchedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(10, Number(limit)));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedLogs = matchedEntries.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      logs: paginatedLogs,
      total: matchedEntries.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(matchedEntries.length / limitNum)
    });
  } catch (error: any) {
    logger.error('Failed to read admin logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Endpoint GET /api/admin/logs/stats
 * Aggregate today's log analytics for summary KPI cards
 */
export const handleGetAdminLogStats = async (req: Request, res: Response) => {
  try {
    const logsDir = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    const todayStr = new Date().toISOString().split('T')[0];

    const stats = {
      errorsToday: 0,
      warningsToday: 0,
      apiFailures: 0,
      paymentFailures: 0,
      orderFailures: 0,
      notificationFailures: 0,
      serviceRequestFailures: 0,
      slowApis: 0,
      totalRequestsToday: 0
    };

    if (!fs.existsSync(logsDir)) {
      return res.status(200).json({ success: true, stats });
    }

    const logFiles = fs.readdirSync(logsDir).filter(f => f.includes(todayStr) && f.endsWith('.log'));

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);

          if (entry.level === 'ERROR') stats.errorsToday++;
          if (entry.level === 'WARN') stats.warningsToday++;
          if (entry.module === 'HTTP') stats.totalRequestsToday++;

          if (entry.errorCode === 'SLOW_API_RESPONSE') stats.slowApis++;
          if (entry.statusCode >= 500) stats.apiFailures++;

          const msgLower = (entry.message || '').toLowerCase();
          const errCodeLower = (entry.errorCode || '').toLowerCase();
          const modLower = (entry.module || '').toLowerCase();

          if (errCodeLower.includes('payment') || msgLower.includes('payment')) stats.paymentFailures++;
          if (errCodeLower.includes('order') || modLower === 'order') stats.orderFailures++;
          if (errCodeLower.includes('whatsapp') || errCodeLower.includes('fcm') || modLower.includes('notification')) stats.notificationFailures++;
          if (errCodeLower.includes('service') || modLower.includes('service')) stats.serviceRequestFailures++;
        } catch { }
      }
    }

    return res.status(200).json({ success: true, stats, date: todayStr });
  } catch (error: any) {
    logger.error('Failed to compute admin log stats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
