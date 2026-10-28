import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import prisma from '../config/database';
import { logger, maskSensitiveData, resolveModule, LogEntry } from '../utils/logger';

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Standardize and normalize legacy or heterogeneous log entries
 */
export function normalizeLogEntry(rawEntry: any): LogEntry {
  if (!rawEntry || typeof rawEntry !== 'object') return rawEntry;
  const meta = rawEntry.metadata || rawEntry.context || {};
  const nestedMeta = (meta && typeof meta === 'object' && meta.metadata && typeof meta.metadata === 'object') ? meta.metadata : {};

  let requestId = rawEntry.requestId || meta.requestId || nestedMeta.requestId || rawEntry.reqId || undefined;
  let route = rawEntry.route || meta.route || nestedMeta.route || undefined;
  let method = rawEntry.method || meta.method || nestedMeta.method || undefined;
  let statusCode = rawEntry.statusCode !== undefined ? rawEntry.statusCode : (meta.statusCode !== undefined ? meta.statusCode : nestedMeta.statusCode);
  let durationMs = rawEntry.durationMs !== undefined ? rawEntry.durationMs : (meta.durationMs !== undefined ? meta.durationMs : nestedMeta.durationMs);

  // Parse HTTP messages if fields missing (e.g. "HTTP GET /api/settings/ 200 (49ms)")
  if (rawEntry.message && typeof rawEntry.message === 'string') {
    const httpMsgMatch = rawEntry.message.match(/HTTP\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s+(\S+)\s+(\d{3})(?:\s*\((\d+)ms\))?/i);
    if (httpMsgMatch) {
      if (!method) method = httpMsgMatch[1].toUpperCase();
      if (!route) route = httpMsgMatch[2];
      if (statusCode === undefined) statusCode = parseInt(httpMsgMatch[3], 10);
      if (durationMs === undefined && httpMsgMatch[4]) durationMs = parseInt(httpMsgMatch[4], 10);
    } else {
      const slowApiMatch = rawEntry.message.match(/Slow API Warning:\s+HTTP\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+took\s+(\d+)ms/i);
      if (slowApiMatch) {
        if (!method) method = slowApiMatch[1].toUpperCase();
        if (!route) route = slowApiMatch[2];
        if (durationMs === undefined && slowApiMatch[3]) durationMs = parseInt(slowApiMatch[3], 10);
      }
    }
  }

  const resolvedModule = resolveModule(rawEntry.module || meta.module, route, rawEntry.service);
  const orderId = rawEntry.orderId || meta.orderId || nestedMeta.orderId || meta.body?.orderId || nestedMeta.body?.orderId || meta.query?.orderId || nestedMeta.query?.orderId || undefined;
  const paymentId = rawEntry.paymentId || meta.paymentId || nestedMeta.paymentId || meta.body?.paymentId || nestedMeta.body?.paymentId || meta.query?.paymentId || nestedMeta.query?.paymentId || undefined;
  const campaignId = rawEntry.campaignId || meta.campaignId || nestedMeta.campaignId || meta.body?.campaignId || nestedMeta.body?.campaignId || meta.query?.campaignId || nestedMeta.query?.campaignId || meta.query?.utm_campaign || nestedMeta.query?.utm_campaign || undefined;
  const errorCode = rawEntry.errorCode || meta.errorCode || nestedMeta.errorCode || undefined;
  const errorName = rawEntry.errorName || meta.errorName || nestedMeta.errorName || undefined;
  const errorStack = rawEntry.errorStack || rawEntry.stackTrace || meta.errorStack || meta.stackTrace || nestedMeta.errorStack || undefined;

  const source = rawEntry.source || meta.source || nestedMeta.source || meta.body?.source || nestedMeta.body?.source || (method === 'CLIENT' ? 'FRONTEND' : 'API');

  const timestamp = rawEntry.timestamp || rawEntry.createdAt || new Date().toISOString();
  const id = rawEntry.id || `log_${new Date(timestamp).getTime()}_${Math.abs(simpleHash(String(rawEntry.message || '') + String(requestId || '') + timestamp))}`;

  return {
    ...rawEntry,
    id,
    timestamp,
    level: rawEntry.level || 'INFO',
    service: rawEntry.service || '3dgalaxy-backend',
    environment: rawEntry.environment || process.env.NODE_ENV || 'development',
    module: resolvedModule,
    requestId,
    route,
    method,
    statusCode: statusCode !== undefined && statusCode !== null ? Number(statusCode) : undefined,
    durationMs: durationMs !== undefined && durationMs !== null ? Number(durationMs) : undefined,
    errorCode,
    errorName,
    errorStack,
    stackTrace: errorStack,
    orderId,
    paymentId,
    campaignId,
    source,
    createdAt: timestamp,
    metadata: meta
  };
}

/**
 * Helper to select appropriate log files to avoid duplicate counts
 */
function getTargetLogFiles(logsDir: string, targetDate: string): string[] {
  if (!fs.existsSync(logsDir)) return [];
  const files = fs.readdirSync(logsDir);
  // Prefer application-*.log files as they contain the complete log stream
  const appFiles = files.filter(f => f.startsWith('application-') && f.includes(targetDate) && f.endsWith('.log'));
  if (appFiles.length > 0) {
    return appFiles;
  }
  return files.filter(f => f.includes(targetDate) && f.endsWith('.log'));
}

/**
 * CSV cell sanitization to prevent CSV Formula Injection
 */
function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Neutralize formula triggers
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Enclose in quotes if commas, quotes, or newlines exist
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

    const assignedRequestId = requestId || req.requestId;
    const resolvedMod = feature ? resolveModule(String(feature).toUpperCase(), route) : 'FRONTEND';

    const logEntryDetails: Partial<LogEntry> = {
      requestId: assignedRequestId,
      route: route || 'client-side',
      method: 'CLIENT',
      statusCode: statusCode || 500,
      module: resolvedMod,
      source: 'FRONTEND',
      errorStack: stack,
      stackTrace: stack,
      errorCode: logLevel === 'WARN' ? 'CLIENT_WARN' : 'CLIENT_ERROR'
    };

    const meta = {
      action: action || 'unhandled-error',
      ...safeMeta,
      breadcrumbs: safeBreadcrumbs
    };

    if (logLevel === 'WARN') {
      logger.warn(`[Client] ${message || 'Frontend Warning'}`, meta, logEntryDetails);
    } else {
      logger.error(`[Client] ${message || 'Frontend Unhandled Error'}`, stack ? { stack, message } : undefined, meta, logEntryDetails);
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
 * Read, normalize, filter and paginate structured log entries
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
      return res.status(200).json({ success: true, logs: [], total: 0, page: 1, limit: Number(limit), totalPages: 1 });
    }

    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    const logFiles = getTargetLogFiles(logsDir, targetDate);

    if (logFiles.length === 0) {
      return res.status(200).json({ success: true, logs: [], total: 0, page: 1, limit: Number(limit), totalPages: 1 });
    }

    const matchedEntries: LogEntry[] = [];
    const seenSignatures = new Set<string>();

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
          const rawEntry = JSON.parse(line);
          const entry = normalizeLogEntry(rawEntry);

          // Deduplicate
          const sig = entry.id || `${entry.timestamp}_${entry.requestId || ''}_${entry.route || ''}_${entry.message}`;
          if (seenSignatures.has(sig)) continue;
          seenSignatures.add(sig);

          if (levelStr && entry.level !== levelStr) continue;
          if (moduleStr && entry.module !== moduleStr) continue;
          if (reqIdStr && entry.requestId !== reqIdStr) continue;
          if (errCodeStr && entry.errorCode !== errCodeStr) continue;

          if (ordIdStr) {
            const ordMatch = (entry.orderId && entry.orderId.toLowerCase().includes(ordIdStr)) ||
              JSON.stringify(entry).toLowerCase().includes(ordIdStr);
            if (!ordMatch) continue;
          }

          if (searchStr) {
            const searchTarget = `${entry.requestId || ''} ${entry.orderId || ''} ${entry.paymentId || ''} ${entry.campaignId || ''} ${entry.route || ''} ${entry.errorCode || ''} ${entry.message || ''} ${JSON.stringify(entry.metadata || '')}`.toLowerCase();
            if (!searchTarget.includes(searchStr)) continue;
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
      totalPages: Math.ceil(matchedEntries.length / limitNum) || 1
    });
  } catch (error: any) {
    logger.error('Failed to read admin logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Endpoint GET /api/admin/logs/stats
 * Aggregate today's log analytics with deduplication and accurate module classification
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
      return res.status(200).json({ success: true, stats, date: todayStr });
    }

    const logFiles = getTargetLogFiles(logsDir, todayStr);
    const seenSignatures = new Set<string>();

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const rawEntry = JSON.parse(line);
          const entry = normalizeLogEntry(rawEntry);

          const sig = entry.id || `${entry.timestamp}_${entry.requestId || ''}_${entry.route || ''}_${entry.message}`;
          if (seenSignatures.has(sig)) continue;
          seenSignatures.add(sig);

          const isError = entry.level === 'ERROR' || entry.level === 'FATAL';
          const isWarn = entry.level === 'WARN';

          if (isError) stats.errorsToday++;
          if (isWarn) stats.warningsToday++;
          if (entry.method && entry.method !== 'CLIENT') stats.totalRequestsToday++;

          if (entry.errorCode === 'SLOW_API_RESPONSE' || (entry.durationMs && entry.durationMs > 1500)) {
            stats.slowApis++;
          }
          if ((entry.statusCode && entry.statusCode >= 500) || entry.errorCode === 'HTTP_SERVER_ERROR') {
            stats.apiFailures++;
          }

          const mod = entry.module ? entry.module.toUpperCase() : '';
          const msgLower = (entry.message || '').toLowerCase();
          const errCodeLower = (entry.errorCode || '').toLowerCase();

          if (mod === 'PAYMENT' || errCodeLower.includes('payment') || msgLower.includes('payment')) {
            if (isError || (entry.statusCode && entry.statusCode >= 400)) stats.paymentFailures++;
          }
          if (mod === 'ORDER' || errCodeLower.includes('order') || msgLower.includes('order')) {
            if (isError || (entry.statusCode && entry.statusCode >= 400)) stats.orderFailures++;
          }
          if (mod === 'NOTIFICATION' || mod === 'WHATSAPP' || errCodeLower.includes('whatsapp') || errCodeLower.includes('fcm')) {
            if (isError || (entry.statusCode && entry.statusCode >= 400)) stats.notificationFailures++;
          }
          if (mod === 'SERVICE' || errCodeLower.includes('service') || msgLower.includes('service-request')) {
            if (isError || (entry.statusCode && entry.statusCode >= 400)) stats.serviceRequestFailures++;
          }
        } catch { }
      }
    }

    return res.status(200).json({ success: true, stats, date: todayStr });
  } catch (error: any) {
    logger.error('Failed to compute admin log stats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Endpoint GET /api/admin/logs/export
 * Export full matching log dataset to CSV with injection safety
 */
export const handleExportAdminLogsCsv = async (req: Request, res: Response) => {
  try {
    const {
      level,
      module: moduleFilter,
      date,
      search,
      requestId,
      orderId,
      errorCode
    } = req.query;

    const logsDir = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];

    if (!fs.existsSync(logsDir)) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="3dgalaxy-system-logs-${targetDate}.csv"`);
      return res.send('ID,Timestamp,Level,Module,Request ID,Method,Route,Status Code,Duration (ms),Message,Error Code,Error Name,User ID,Order ID,Payment ID,Campaign ID,Environment,Source\n');
    }

    const logFiles = getTargetLogFiles(logsDir, targetDate);
    const matchedEntries: LogEntry[] = [];
    const seenSignatures = new Set<string>();

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
          const rawEntry = JSON.parse(line);
          const entry = normalizeLogEntry(rawEntry);

          const sig = entry.id || `${entry.timestamp}_${entry.requestId || ''}_${entry.route || ''}_${entry.message}`;
          if (seenSignatures.has(sig)) continue;
          seenSignatures.add(sig);

          if (levelStr && entry.level !== levelStr) continue;
          if (moduleStr && entry.module !== moduleStr) continue;
          if (reqIdStr && entry.requestId !== reqIdStr) continue;
          if (errCodeStr && entry.errorCode !== errCodeStr) continue;

          if (ordIdStr) {
            const ordMatch = (entry.orderId && entry.orderId.toLowerCase().includes(ordIdStr)) ||
              JSON.stringify(entry).toLowerCase().includes(ordIdStr);
            if (!ordMatch) continue;
          }

          if (searchStr) {
            const searchTarget = `${entry.requestId || ''} ${entry.orderId || ''} ${entry.paymentId || ''} ${entry.campaignId || ''} ${entry.route || ''} ${entry.errorCode || ''} ${entry.message || ''} ${JSON.stringify(entry.metadata || '')}`.toLowerCase();
            if (!searchTarget.includes(searchStr)) continue;
          }

          matchedEntries.push(entry);
        } catch { }
      }
    }

    // Sort descending by timestamp
    matchedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const headers = [
      'ID',
      'Timestamp',
      'Level',
      'Module',
      'Request ID',
      'Method',
      'Route',
      'Status Code',
      'Duration (ms)',
      'Message',
      'Error Code',
      'Error Name',
      'User ID',
      'Order ID',
      'Payment ID',
      'Campaign ID',
      'Environment',
      'Source'
    ];

    const rows = matchedEntries.map(entry => [
      sanitizeCsvCell(entry.id),
      sanitizeCsvCell(entry.timestamp),
      sanitizeCsvCell(entry.level),
      sanitizeCsvCell(entry.module),
      sanitizeCsvCell(entry.requestId || 'N/A'),
      sanitizeCsvCell(entry.method || ''),
      sanitizeCsvCell(entry.route || ''),
      sanitizeCsvCell(entry.statusCode !== undefined ? entry.statusCode : ''),
      sanitizeCsvCell(entry.durationMs !== undefined ? entry.durationMs : ''),
      sanitizeCsvCell(entry.message),
      sanitizeCsvCell(entry.errorCode || ''),
      sanitizeCsvCell(entry.errorName || ''),
      sanitizeCsvCell(entry.userId || ''),
      sanitizeCsvCell(entry.orderId || ''),
      sanitizeCsvCell(entry.paymentId || ''),
      sanitizeCsvCell(entry.campaignId || ''),
      sanitizeCsvCell(entry.environment || ''),
      sanitizeCsvCell(entry.source || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="3dgalaxy-system-logs-${targetDate}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    logger.error('Failed to export admin logs to CSV:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
