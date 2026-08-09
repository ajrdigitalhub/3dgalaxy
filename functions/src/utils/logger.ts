import fs from 'fs';
import path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
  errorCode?: string;
  errorStack?: string;
  module?: string;
  metadata?: Record<string, any>;
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
    ERROR: 40
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

    const sanitizedMetadata = entry.metadata ? maskSensitiveData(entry.metadata) : undefined;
    const finalEntry: LogEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      service: this.serviceName,
      environment: this.environment,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
      ...(entry.userId ? { userId: entry.userId } : {}),
      ...(entry.route ? { route: entry.route } : {}),
      ...(entry.method ? { method: entry.method } : {}),
      ...(entry.statusCode !== undefined ? { statusCode: entry.statusCode } : {}),
      ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}),
      ...(entry.module ? { module: entry.module } : {}),
      message: entry.message,
      ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
      ...(entry.errorStack ? { errorStack: entry.errorStack } : {}),
      ...(sanitizedMetadata && Object.keys(sanitizedMetadata).length > 0 ? { metadata: sanitizedMetadata } : {})
    };

    const logLine = JSON.stringify(finalEntry) + '\n';
    const dateStr = finalEntry.timestamp.split('T')[0];

    // Write to application log
    const appLogPath = this.getLogFilePath('application', dateStr);
    fs.appendFile(appLogPath, logLine, () => { });

    // Write to error/warn log if applicable
    if (finalEntry.level === 'ERROR') {
      const errLogPath = this.getLogFilePath('error', dateStr);
      fs.appendFile(errLogPath, logLine, () => { });
    } else if (finalEntry.level === 'WARN') {
      const warnLogPath = this.getLogFilePath('warn', dateStr);
      fs.appendFile(warnLogPath, logLine, () => { });
    }

    // Stdout / Stderr output
    if (this.environment === 'development') {
      const icon = finalEntry.level === 'ERROR' ? '❌' : finalEntry.level === 'WARN' ? '⚠️' : finalEntry.level === 'INFO' ? 'ℹ️' : '🔍';
      const reqIdStr = finalEntry.requestId ? ` [${finalEntry.requestId}]` : '';
      const modStr = finalEntry.module ? ` [${finalEntry.module}]` : '';
      const formatted = `${icon} [${finalEntry.timestamp}] ${finalEntry.level}${reqIdStr}${modStr}: ${finalEntry.message}`;
      if (finalEntry.level === 'ERROR') {
        console.error(formatted, finalEntry.errorStack || finalEntry.metadata || '');
      } else if (finalEntry.level === 'WARN') {
        console.warn(formatted, finalEntry.metadata || '');
      } else {
        console.log(formatted);
      }
    } else {
      if (finalEntry.level === 'ERROR') {
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
