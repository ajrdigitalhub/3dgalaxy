export interface TaskHubMeta {
  applicationId: string;
  environment: string;
  resource: string;
  timestamp: string;
  requestId: string;
  page: number | null;
  limit: number | null;
  total: number | null;
  hasMore: boolean;
  nextCursor: string | null;
  [key: string]: any;
}

export interface TaskHubError {
  code: string;
  message: string;
  details?: any;
}

export interface TaskHubEnvelope<T> {
  success: boolean;
  data: T | null;
  meta: TaskHubMeta;
  error: TaskHubError | null;
}

export interface TaskHubHealthServiceStatus {
  status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED' | 'CONNECTED' | 'DISCONNECTED' | 'DISABLED' | 'BUSY';
  latencyMs?: number;
  details?: string;
  [key: string]: any;
}

export interface TaskHubHealthData {
  application: {
    name: string;
    version: string;
    environment: string;
    nodeId: string;
    pid: number;
  };
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  isHealthy: boolean;
  uptimeSeconds: number;
  timestamp: string;
  services: {
    database: TaskHubHealthServiceStatus;
    firebase: TaskHubHealthServiceStatus;
    storage: TaskHubHealthServiceStatus;
    backupScheduler: TaskHubHealthServiceStatus;
  };
}

export interface TaskHubMetricsData {
  application: {
    availability: boolean;
    uptimeSeconds: number;
    bootTime: string;
    version: string;
  };
  cpu: {
    process: {
      userMicroseconds: number;
      systemMicroseconds: number;
      totalMicroseconds: number;
      cpuPercent: number;
      userPercent: number;
      systemPercent: number;
    };
    system: {
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      cpuCount: number;
      model: string;
    };
  };
  memory: {
    process: {
      rssBytes: number;
      heapTotalBytes: number;
      heapUsedBytes: number;
      externalBytes: number;
      arrayBuffersBytes: number;
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    system: {
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      totalMb: number;
      freeMb: number;
      usedMb: number;
      usedPercent: number;
    };
  };
  disk: {
    totalBytes: number;
    freeBytes: number;
    availableBytes: number;
    usedBytes: number;
    percentUsed: number | null;
    unit: string;
    source: string;
  } | null;
  network: {
    processHttp: {
      totalBytesIn: number;
      totalBytesOut: number;
      totalRequests: number;
    };
    hostThroughput: null; // Explicitly null: host-level network interface metrics require privileged container access
  };
  traffic: {
    requestRatePerSecond: number;
    requestRatePerMinute: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalRequests5m: number;
    clientErrorRatePercent: number;
    serverErrorRatePercent: number;
    totalErrors5m: number;
  };
  database: {
    connected: boolean;
    latencyMs: number;
    pool: {
      totalConnections: number;
      idleConnections: number;
      activeConnections: number;
      waitingRequests: number;
      maxConnections: number;
    };
  };
  backgroundJobs: {
    backupScheduler: {
      enabled: boolean;
      isBusy: boolean;
      status: string;
      schedule: string;
    };
    fcmNotifications: {
      enabled: boolean;
      projectId: string;
    };
  };
  deployment: {
    applicationId: string;
    version: string;
    environment: string;
    commitSha: string | null;
    buildRevision: string | null;
    nodeVersion: string;
    processId: number;
    platform: string;
    arch: string;
  };
  collection: {
    timestamp: string;
    sources: string[];
    limitations: string[];
  };
}

export interface TaskHubTrafficBucket {
  timestamp: string;
  intervalMinutes: number;
  totalRequests: number;
  successfulRequests: number;
  clientErrors: number;
  serverErrors: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalResponseBytes: number;
  byRoute: Record<string, number>;
  byMethod: Record<string, number>;
  byStatusCode: Record<string, number>;
}

export interface TaskHubDeploymentRecord {
  deploymentId: string;
  applicationId: string;
  environment: string;
  version: string;
  commitSha: string | null;
  branch: string | null;
  deployedAt: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'FAILED';
  runtime: string;
  platform: string;
  uptimeSeconds: number;
  healthStatus: string;
}

export interface TaskHubDiagnosticsData {
  applicationHealth: TaskHubHealthData;
  processStatus: {
    pid: number;
    uptimeSeconds: number;
    version: string;
    platform: string;
    arch: string;
  };
  resourceUtilization: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    memoryPercent: number;
    diskPercentUsed: number | null;
  };
  databaseConnectivity: {
    connected: boolean;
    latencyMs: number;
    pool: {
      totalConnections: number;
      idleConnections: number;
      activeConnections: number;
      waitingRequests: number;
      maxConnections: number;
    };
  };
  recentLogs: Array<{
    timestamp: string;
    level: string;
    message: string;
    module?: string;
    errorCode?: string;
  }>;
  recentDeployments: TaskHubDeploymentRecord[];
  readOnly: true;
}
