import fs from 'fs';
import path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  module?: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
  errorCode?: string;
  errorName?: string;
  errorStack?: string;
  stackTrace?: string;
  orderId?: string;
  paymentId?: string;
  campaignId?: string;
  source?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt?: string;
  [key: string]: any;
}

const SENSITIVE_KEYS = [
  'password',
  'pass',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'otp',
  'cvv',
  'cardnumber',
  'card_number',
  'secret',
  'apikey',
  'api_key',
  'x-api-key',
  'x_api_key',
  'taskhub_api_key',
  'taskhub_key',
  'firebasetoken',
  'fcmtoken',
  'paymenttoken',
  'upicredentials'
];

/**
 * Mask sensitive data keys in objects/arrays
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Mask potential JWT tokens
    if (data.startsWith('Bearer ') || (data.length > 80 && /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(data))) {
      return '[REDACTED_TOKEN]';
    }
    // Mask phone numbers if raw format matched
    if (/^\+?\d{10,13}$/.test(data)) {
      return data.replace(/(\d{2,4})\d{4,6}(\d{3,4})/, '$1******$2');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const masked: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    }
    return masked;
  }

  return data;
}


/**
 * Standardized module classifier across HTTP routes and business services
 */
export function resolveModule(explicitModule?: string, route?: string, service?: string): string {
  if (explicitModule && explicitModule.toUpperCase() !== 'HTTP' && explicitModule.toUpperCase() !== 'SERVER') {
    return explicitModule.toUpperCase();
  }
  if (route) {
    const cleanRoute = route.toLowerCase().split('?')[0];
    if (cleanRoute.includes('/api/orders') || cleanRoute.includes('/api/checkout')) return 'ORDER';
    if (cleanRoute.includes('/api/cart')) return 'CART';
    if (cleanRoute.includes('/api/payment') || cleanRoute.includes('/api/razorpay') || cleanRoute.includes('/api/cashfree') || cleanRoute.includes('/api/phonepe') || cleanRoute.includes('/webhook/razorpay')) return 'PAYMENT';
    if (cleanRoute.includes('/api/auth') || cleanRoute.includes('/customer/auth') || cleanRoute.includes('/admin/auth')) return 'AUTH';
    if (cleanRoute.includes('/api/products') || cleanRoute.includes('/api/categories') || cleanRoute.includes('/api/brands') || cleanRoute.includes('/api/inventory')) return 'PRODUCT';
    if (cleanRoute.includes('/api/notifications') || cleanRoute.includes('/api/push') || cleanRoute.includes('/api/fcm')) return 'NOTIFICATION';
    if (cleanRoute.includes('/api/whatsapp')) return 'WHATSAPP';
    if (cleanRoute.includes('/api/service-requests') || cleanRoute.includes('/api/services')) return 'SERVICE';
    if (cleanRoute.includes('/api/logs/client')) return 'FRONTEND';
    if (cleanRoute.includes('/api/admin')) return 'ADMIN';
    if (cleanRoute.includes('/api/health') || cleanRoute.includes('/api/settings')) return 'SYSTEM';
  }
  if (service && service !== '3dgalaxy-backend') {
    return service.toUpperCase();
  }
  return explicitModule ? explicitModule.toUpperCase() : 'HTTP';
}

class Logger {
  private logsDir: string;
  private serviceName: string;
  private environment: string;
  private minLogLevel: LogLevel;
  private maxFileSize: number;
  private retentionDays: number;
  private lastCleanupDate: string = '';

  private levelWeights: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    FATAL: 50
  };

  constructor() {
    // Resolve logs directory path
    this.logsDir = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    this.serviceName = process.env.SERVICE_NAME || '3dgalaxy-backend';
    this.environment = process.env.NODE_ENV || 'development';
    this.minLogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || (this.environment === 'production' ? 'INFO' : 'DEBUG');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);

    this.ensureLogsDir();
    this.cleanOldLogs();
  }

  private ensureLogsDir() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (err) {
      console.error('[Logger] Failed to create logs directory:', err);
    }
  }

  /**
   * Automatically delete logs older than retention days
   */
  private cleanOldLogs() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.lastCleanupDate === todayStr) return;
    this.lastCleanupDate = todayStr;

    try {
      if (!fs.existsSync(this.logsDir)) return;
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const maxAgeMs = this.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        const filePath = path.join(this.logsDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
          }
        } catch { }
      }
    } catch (err) {
      console.error('[Logger] Cleanup error:', err);
    }
  }

  /**
   * Get log filename for date and category with size splitting
   */
  private getLogFilePath(type: 'application' | 'error' | 'warn', dateStr: string): string {
    let index = 0;
    let fileName = `${type}-${dateStr}.log`;
    let filePath = path.join(this.logsDir, fileName);

    while (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size < this.maxFileSize) {
          break;
        }
        index++;
        fileName = `${type}-${dateStr}.${index}.log`;
        filePath = path.join(this.logsDir, fileName);
      } catch {
        break;
      }
    }

    return filePath;
  }

  /**
   * Write log entry asynchronously to file streams and stdout/stderr
   */
  private writeLog(entry: LogEntry) {
    if (this.levelWeights[entry.level] < this.levelWeights[this.minLogLevel]) {
      return;
    }

    this.cleanOldLogs();

    const meta = entry.metadata || entry.context || {};
    const nestedMeta = meta.metadata || {};

    const requestId = entry.requestId || meta.requestId || nestedMeta.requestId || undefined;
    const route = entry.route || meta.route || nestedMeta.route || undefined;
    const method = entry.method || meta.method || nestedMeta.method || undefined;
    const statusCode = entry.statusCode !== undefined ? entry.statusCode : (meta.statusCode !== undefined ? meta.statusCode : nestedMeta.statusCode);
    const durationMs = entry.durationMs !== undefined ? entry.durationMs : (meta.durationMs !== undefined ? meta.durationMs : nestedMeta.durationMs);
    const userId = entry.userId || meta.userId || nestedMeta.userId || undefined;
    const orderId = entry.orderId || meta.orderId || nestedMeta.orderId || undefined;
    const paymentId = entry.paymentId || meta.paymentId || nestedMeta.paymentId || undefined;
    const campaignId = entry.campaignId || meta.campaignId || nestedMeta.campaignId || undefined;
    const errorCode = entry.errorCode || meta.errorCode || nestedMeta.errorCode || undefined;
    const errorName = entry.errorName || meta.errorName || nestedMeta.errorName || undefined;
    const errorStack = entry.errorStack || entry.stackTrace || meta.errorStack || meta.stackTrace || nestedMeta.errorStack || undefined;

    const resolvedModule = resolveModule(entry.module || meta.module, route, entry.service);
    const logId = entry.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = entry.timestamp || new Date().toISOString();

    const sanitizedMetadata = meta ? maskSensitiveData(meta) : undefined;

    const finalEntry: LogEntry = {
      id: logId,
      timestamp,
      level: entry.level,
      service: this.serviceName,
      environment: this.environment,
      module: resolvedModule,
      ...(requestId ? { requestId } : {}),
      ...(userId ? { userId } : {}),
      ...(route ? { route } : {}),
      ...(method ? { method } : {}),
      ...(statusCode !== undefined ? { statusCode: Number(statusCode) } : {}),
      ...(durationMs !== undefined ? { durationMs: Number(durationMs) } : {}),
      message: entry.message,
      ...(errorCode ? { errorCode } : {}),
      ...(errorName ? { errorName } : {}),
      ...(errorStack ? { errorStack, stackTrace: errorStack } : {}),
      ...(orderId ? { orderId } : {}),
      ...(paymentId ? { paymentId } : {}),
      ...(campaignId ? { campaignId } : {}),
      source: entry.source || (method === 'CLIENT' ? 'FRONTEND' : 'API'),
      createdAt: timestamp,
      ...(sanitizedMetadata && Object.keys(sanitizedMetadata).length > 0 ? { metadata: sanitizedMetadata, context: sanitizedMetadata } : {})
    };

    const logLine = JSON.stringify(finalEntry) + '\n';
    const dateStr = finalEntry.timestamp.split('T')[0];

    // Write to application log
    const appLogPath = this.getLogFilePath('application', dateStr);
    fs.appendFile(appLogPath, logLine, () => { });

    // Write to error/warn log if applicable
    if (finalEntry.level === 'ERROR' || finalEntry.level === 'FATAL') {
      const errLogPath = this.getLogFilePath('error', dateStr);
      fs.appendFile(errLogPath, logLine, () => { });
    } else if (finalEntry.level === 'WARN') {
      const warnLogPath = this.getLogFilePath('warn', dateStr);
      fs.appendFile(warnLogPath, logLine, () => { });
    }

    // Stdout / Stderr output
    if (this.environment === 'development') {
      const isErr = finalEntry.level === 'ERROR' || finalEntry.level === 'FATAL';
      const icon = isErr ? '❌' : finalEntry.level === 'WARN' ? '⚠️' : finalEntry.level === 'INFO' ? 'ℹ️' : '🔍';
      const reqIdStr = finalEntry.requestId ? ` [${finalEntry.requestId}]` : '';
      const modStr = finalEntry.module ? ` [${finalEntry.module}]` : '';
      const formatted = `${icon} [${finalEntry.timestamp}] ${finalEntry.level}${reqIdStr}${modStr}: ${finalEntry.message}`;
      if (isErr) {
        console.error(formatted, finalEntry.errorStack || finalEntry.metadata || '');
      } else if (finalEntry.level === 'WARN') {
        console.warn(formatted, finalEntry.metadata || '');
      } else {
        console.log(formatted);
      }
    } else {
      if (finalEntry.level === 'ERROR' || finalEntry.level === 'FATAL') {
        process.stderr.write(logLine);
      } else {
        process.stdout.write(logLine);
      }
    }
  }

  public debug(message: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      service: this.serviceName,
      environment: this.environment,
      message,
      metadata: meta,
      ...extra
    });
  }

  public info(message: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      environment: this.environment,
      message,
      metadata: meta,
      ...extra
    });
  }

  public warn(message: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: this.serviceName,
      environment: this.environment,
      message,
      metadata: meta,
      ...extra
    });
  }

  public fatal(message: string, error?: any, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) {
    this.error(message, error, meta, { ...extra, level: 'FATAL' });
  }

  public error(message: string, error?: any, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) {
    let errorStack: string | undefined;
    let errorCode: string | undefined = extra.errorCode;

    if (error) {
      if (error instanceof Error) {
        errorStack = error.stack;
        if (!errorCode && (error as any).code) {
          errorCode = String((error as any).code);
        }
      } else if (typeof error === 'object') {
        if (error.message) message = `${message}: ${error.message}`;
        if (error.stack) errorStack = error.stack;
        if (error.code) errorCode = String(error.code);
        meta = { ...meta, errorObj: maskSensitiveData(error) };
      } else {
        meta = { ...meta, rawError: String(error) };
      }
    }

    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      environment: this.environment,
      message,
      errorCode,
      errorStack,
      metadata: meta,
      ...extra
    });
  }

  public child(bindings: Record<string, any>) {
    return {
      debug: (msg: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) =>
        this.debug(msg, { ...bindings.metadata, ...meta }, { ...bindings, ...extra }),

      info: (msg: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) =>
        this.info(msg, { ...bindings.metadata, ...meta }, { ...bindings, ...extra }),

      warn: (msg: string, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) =>
        this.warn(msg, { ...bindings.metadata, ...meta }, { ...bindings, ...extra }),

      error: (msg: string, err?: any, meta: Record<string, any> = {}, extra: Partial<LogEntry> = {}) =>
        this.error(msg, err, { ...bindings.metadata, ...meta }, { ...bindings, ...extra })
    };
  }
}

export const logger = new Logger();
