import { Request, Response, NextFunction } from 'express';
import { TaskHubTrafficBucket } from './taskhub.types';

export interface RawRequestRecord {
  timestamp: number;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  responseBytes: number;
  errorClassification: 'CLIENT_ERROR' | 'SERVER_ERROR' | 'NONE';
}

interface MinuteBucket {
  timestampMs: number; // Unix epoch rounded down to the minute
  isoTimestamp: string;
  totalRequests: number;
  successfulRequests: number;
  clientErrors: number;
  serverErrors: number;
  totalResponseBytes: number;
  durations: number[]; // Latency samples for calculating percentiles
  routes: Record<string, number>;
  methods: Record<string, number>;
  statusCodes: Record<number, number>;
}

export class TrafficTracker {
  private buckets: Map<number, MinuteBucket> = new Map();
  private maxRetentionMinutes: number = 1440; // 24 hours of 1-minute resolution
  private totalHttpBytesIn: number = 0;
  private totalHttpBytesOut: number = 0;
  private totalHttpRequests: number = 0;

  /**
   * Normalizes raw URLs into route templates, replacing IDs/UUIDs with :id
   * Avoids high-cardinality explosions and redacts potential PII in paths.
   */
  public normalizeRoute(rawPath: string): string {
    if (!rawPath) return '/';

    // Strip query string and hashes
    let normalized = rawPath.split('?')[0].split('#')[0];

    // Normalize multiple slashes and trailing slashes
    normalized = normalized.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';

    // Replace standard UUIDs (8-4-4-4-12)
    normalized = normalized.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,
      '/:id'
    );

    // Replace Mongo/BSON 24-character hex ObjectIDs
    normalized = normalized.replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id');

    // Replace numeric integer IDs
    normalized = normalized.replace(/\/\d+(?=\/|$)/g, '/:id');

    // Replace other alphanumeric long random token strings (>= 16 chars)
    normalized = normalized.replace(/\/[a-zA-Z0-9_-]{16,}(?=\/|$)/g, '/:id');

    return normalized;
  }

  /**
   * Records a completed HTTP request measurement
   */
  public recordRequest(record: RawRequestRecord): void {
    // 1. Skip monitoring requests to prevent self-amplifying metrics loops
    if (record.route.startsWith('/api/integration/v1')) {
      return;
    }

    this.totalHttpRequests++;
    this.totalHttpBytesOut += record.responseBytes;

    const minuteKey = Math.floor(record.timestamp / 60000) * 60000;
    let bucket = this.buckets.get(minuteKey);

    if (!bucket) {
      bucket = {
        timestampMs: minuteKey,
        isoTimestamp: new Date(minuteKey).toISOString(),
        totalRequests: 0,
        successfulRequests: 0,
        clientErrors: 0,
        serverErrors: 0,
        totalResponseBytes: 0,
        durations: [],
        routes: {},
        methods: {},
        statusCodes: {},
      };
      this.buckets.set(minuteKey, bucket);
      this.purgeOldBuckets();
    }

    bucket.totalRequests++;
    if (record.statusCode >= 500) {
      bucket.serverErrors++;
    } else if (record.statusCode >= 400) {
      bucket.clientErrors++;
    } else {
      bucket.successfulRequests++;
    }

    bucket.totalResponseBytes += record.responseBytes;

    // Cap durations array per minute to prevent memory exhaustion (max 1000 samples/min)
    if (bucket.durations.length < 1000) {
      bucket.durations.push(record.durationMs);
    }

    bucket.routes[record.route] = (bucket.routes[record.route] || 0) + 1;
    bucket.methods[record.method] = (bucket.methods[record.method] || 0) + 1;
    bucket.statusCodes[record.statusCode] = (bucket.statusCodes[record.statusCode] || 0) + 1;
  }

  /**
   * Tracks incoming request byte size
   */
  public recordBytesIn(bytes: number): void {
    if (bytes > 0) {
      this.totalHttpBytesIn += bytes;
    }
  }

  /**
   * Removes buckets older than retention window
   */
  private purgeOldBuckets(): void {
    const oldestAllowed = Date.now() - this.maxRetentionMinutes * 60 * 1000;
    for (const key of this.buckets.keys()) {
      if (key < oldestAllowed) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Calculates percentile from an array of numbers
   */
  private calculatePercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  }

  /**
   * Returns aggregated traffic metrics over specified window and filters
   */
  public getTrafficMetrics(options: {
    window?: string;
    from?: string;
    to?: string;
    endpoint?: string;
    method?: string;
    statusCode?: string | number;
    page?: number;
    limit?: number;
  }): {
    buckets: TaskHubTrafficBucket[];
    totalBuckets: number;
    page: number;
    limit: number;
    hasMore: boolean;
  } {
    const windowStr = (options.window || '5m').toLowerCase();
    let windowMinutes = 5;
    if (windowStr === '1m') windowMinutes = 1;
    else if (windowStr === '5m') windowMinutes = 5;
    else if (windowStr === '15m') windowMinutes = 15;
    else if (windowStr === '1h') windowMinutes = 60;
    else if (windowStr === '24h') windowMinutes = 1440;

    const fromMs = options.from ? new Date(options.from).getTime() : Date.now() - 60 * 60 * 1000;
    const toMs = options.to ? new Date(options.to).getTime() : Date.now();

    const endpointFilter = options.endpoint ? this.normalizeRoute(options.endpoint) : null;
    const methodFilter = options.method ? options.method.toUpperCase() : null;
    const statusFilter = options.statusCode ? String(options.statusCode) : null;

    // Filter candidate 1-minute buckets
    const matchingBuckets: MinuteBucket[] = [];
    for (const bucket of this.buckets.values()) {
      if (bucket.timestampMs >= fromMs && bucket.timestampMs <= toMs) {
        matchingBuckets.push(bucket);
      }
    }

    matchingBuckets.sort((a, b) => a.timestampMs - b.timestampMs);

    // Group 1-minute buckets into target window intervals
    const windowMs = windowMinutes * 60 * 1000;
    const groupedMap = new Map<number, TaskHubTrafficBucket>();

    for (const mb of matchingBuckets) {
      const groupKey = Math.floor(mb.timestampMs / windowMs) * windowMs;
      let agg = groupedMap.get(groupKey);

      if (!agg) {
        agg = {
          timestamp: new Date(groupKey).toISOString(),
          intervalMinutes: windowMinutes,
          totalRequests: 0,
          successfulRequests: 0,
          clientErrors: 0,
          serverErrors: 0,
          errorRatePercent: 0,
          avgLatencyMs: 0,
          minLatencyMs: 0,
          maxLatencyMs: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          totalResponseBytes: 0,
          byRoute: {},
          byMethod: {},
          byStatusCode: {},
        };
        groupedMap.set(groupKey, agg);
      }

      // Check filters
      if (endpointFilter && !mb.routes[endpointFilter]) continue;
      if (methodFilter && !mb.methods[methodFilter]) continue;
      if (statusFilter) {
        const matchesStatus = Object.keys(mb.statusCodes).some((code) => {
          if (statusFilter === '4xx') return code.startsWith('4');
          if (statusFilter === '5xx') return code.startsWith('5');
          return code === statusFilter;
        });
        if (!matchesStatus) continue;
      }

      agg.totalRequests += mb.totalRequests;
      agg.successfulRequests += mb.successfulRequests;
      agg.clientErrors += mb.clientErrors;
      agg.serverErrors += mb.serverErrors;
      agg.totalResponseBytes += mb.totalResponseBytes;

      for (const [r, count] of Object.entries(mb.routes)) {
        agg.byRoute[r] = (agg.byRoute[r] || 0) + count;
      }
      for (const [m, count] of Object.entries(mb.methods)) {
        agg.byMethod[m] = (agg.byMethod[m] || 0) + count;
      }
      for (const [c, count] of Object.entries(mb.statusCodes)) {
        agg.byStatusCode[c] = (agg.byStatusCode[c] || 0) + count;
      }
    }

    // Second pass: Calculate latencies and error rates for each aggregate window
    const aggregatedList: TaskHubTrafficBucket[] = [];
    for (const [groupKey, agg] of groupedMap.entries()) {
      const windowEndMs = groupKey + windowMs;
      const allDurations: number[] = [];

      for (const mb of matchingBuckets) {
        if (mb.timestampMs >= groupKey && mb.timestampMs < windowEndMs) {
          allDurations.push(...mb.durations);
        }
      }

      allDurations.sort((a, b) => a - b);

      if (allDurations.length > 0) {
        const sum = allDurations.reduce((acc, d) => acc + d, 0);
        agg.avgLatencyMs = Number((sum / allDurations.length).toFixed(2));
        agg.minLatencyMs = allDurations[0];
        agg.maxLatencyMs = allDurations[allDurations.length - 1];
        agg.p50LatencyMs = this.calculatePercentile(allDurations, 50);
        agg.p95LatencyMs = this.calculatePercentile(allDurations, 95);
        agg.p99LatencyMs = this.calculatePercentile(allDurations, 99);
      }

      const totalErrors = agg.clientErrors + agg.serverErrors;
      agg.errorRatePercent = agg.totalRequests > 0
        ? Number(((totalErrors / agg.totalRequests) * 100).toFixed(2))
        : 0;

      aggregatedList.push(agg);
    }

    // Sort descending by timestamp (newest first)
    aggregatedList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const startIndex = (page - 1) * limit;
    const paginated = aggregatedList.slice(startIndex, startIndex + limit);

    return {
      buckets: paginated,
      totalBuckets: aggregatedList.length,
      page,
      limit,
      hasMore: startIndex + limit < aggregatedList.length,
    };
  }

  /**
   * Returns high-level summary metrics over recent window (default 5 minutes)
   */
  public getTrafficSummary(windowMinutes = 5) {
    const now = Date.now();
    const windowStartMs = now - windowMinutes * 60 * 1000;

    let totalRequests = 0;
    let clientErrors = 0;
    let serverErrors = 0;
    const durations: number[] = [];

    for (const bucket of this.buckets.values()) {
      if (bucket.timestampMs >= windowStartMs) {
        totalRequests += bucket.totalRequests;
        clientErrors += bucket.clientErrors;
        serverErrors += bucket.serverErrors;
        durations.push(...bucket.durations);
      }
    }

    durations.sort((a, b) => a - b);

    const seconds = windowMinutes * 60;
    const requestRatePerSecond = Number((totalRequests / seconds).toFixed(2));
    const requestRatePerMinute = Number((totalRequests / windowMinutes).toFixed(2));

    const avgLatencyMs = durations.length > 0
      ? Number((durations.reduce((acc, d) => acc + d, 0) / durations.length).toFixed(2))
      : 0;

    const p50LatencyMs = this.calculatePercentile(durations, 50);
    const p95LatencyMs = this.calculatePercentile(durations, 95);
    const p99LatencyMs = this.calculatePercentile(durations, 99);

    const totalErrors = clientErrors + serverErrors;
    const clientErrorRatePercent = totalRequests > 0
      ? Number(((clientErrors / totalRequests) * 100).toFixed(2))
      : 0;
    const serverErrorRatePercent = totalRequests > 0
      ? Number(((serverErrors / totalRequests) * 100).toFixed(2))
      : 0;

    return {
      requestRatePerSecond,
      requestRatePerMinute,
      avgLatencyMs,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      totalRequests5m: totalRequests,
      clientErrorRatePercent,
      serverErrorRatePercent,
      totalErrors5m: totalErrors,
      totalHttpBytesIn: this.totalHttpBytesIn,
      totalHttpBytesOut: this.totalHttpBytesOut,
      totalHttpRequests: this.totalHttpRequests,
    };
  }
}

export const trafficTracker = new TrafficTracker();

/**
 * Express middleware to record traffic metrics without overhead
 */
export function trafficInstrumentationMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Track incoming payload byte size
  if (req.headers['content-length']) {
    const len = parseInt(req.headers['content-length'], 10);
    if (!isNaN(len) && len > 0) {
      trafficTracker.recordBytesIn(len);
    }
  }

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method.toUpperCase();

    // Determine normalized route template
    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : (req.originalUrl || req.url);
    const normalizedRoute = trafficTracker.normalizeRoute(rawPath);

    // Compute response byte size from content-length header if present
    let responseBytes = 0;
    const contentLength = res.getHeader('content-length');
    if (contentLength) {
      responseBytes = parseInt(String(contentLength), 10) || 0;
    }

    const errorClassification =
      statusCode >= 500 ? 'SERVER_ERROR' : statusCode >= 400 ? 'CLIENT_ERROR' : 'NONE';

    trafficTracker.recordRequest({
      timestamp: startTime,
      route: normalizedRoute,
      method,
      statusCode,
      durationMs,
      responseBytes,
      errorClassification,
    });
  });

  next();
}
