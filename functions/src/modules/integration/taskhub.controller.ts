import { Response } from 'express';
import { AuthenticatedTaskHubRequest } from './taskhub.middleware';
import { taskhubService } from './taskhub.service';
import { createSuccessEnvelope, createErrorEnvelope } from './taskhub.envelope';
import { logger } from '../../utils/logger';

export class TaskHubController {
  // ---------------------------------------------------------------------------
  // 1. GET /api/integration/v1/health
  // ---------------------------------------------------------------------------
  public async getHealth(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const health = await taskhubService.getHealth();
      const statusCode = health.isHealthy ? 200 : 503;
      return res.status(statusCode).json(createSuccessEnvelope(health, 'health', requestId));
    } catch (error: any) {
      logger.error('[TASKHUB API] Health check error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'HEALTH_CHECK_FAILED',
          error.message || 'Health check execution failed',
          'health',
          requestId
        )
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 2. GET /api/integration/v1/metrics
  // ---------------------------------------------------------------------------
  public async getMetrics(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const metrics = await taskhubService.getMetrics();
      return res.status(200).json(createSuccessEnvelope(metrics, 'metrics', requestId));
    } catch (error: any) {
      logger.error('[TASKHUB API] Metrics retrieval error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'METRICS_RETRIEVAL_FAILED',
          error.message || 'Failed to collect runtime metrics',
          'metrics',
          requestId
        )
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. GET /api/integration/v1/logs
  // ---------------------------------------------------------------------------
  public async getLogs(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const {
        page = 1,
        limit = 50,
        date,
        from,
        to,
        level,
        module: moduleFilter,
        search,
        requestId: filterRequestId,
        errorCode,
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json(
          createErrorEnvelope(
            'INVALID_PARAMETER',
            "Parameter 'page' must be a positive integer greater than or equal to 1.",
            'logs',
            requestId
          )
        );
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        return res.status(400).json(
          createErrorEnvelope(
            'INVALID_PARAMETER',
            "Parameter 'limit' must be between 1 and 200.",
            'logs',
            requestId
          )
        );
      }

      const result = await taskhubService.getLogs({
        page: pageNum,
        limit: limitNum,
        date: date ? String(date) : undefined,
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        level: level ? String(level) : undefined,
        module: moduleFilter ? String(moduleFilter) : undefined,
        search: search ? String(search) : undefined,
        requestId: filterRequestId ? String(filterRequestId) : undefined,
        errorCode: errorCode ? String(errorCode) : undefined,
      });

      return res.status(200).json(
        createSuccessEnvelope(result.logs, 'logs', requestId, {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
        })
      );
    } catch (error: any) {
      logger.error('[TASKHUB API] Logs retrieval error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'LOGS_RETRIEVAL_FAILED',
          error.message || 'Failed to retrieve application logs',
          'logs',
          requestId
        )
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. GET /api/integration/v1/traffic
  // ---------------------------------------------------------------------------
  public async getTraffic(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const {
        window: windowParam = '5m',
        from,
        to,
        endpoint,
        method,
        statusCode,
        page = 1,
        limit = 50,
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json(
          createErrorEnvelope(
            'INVALID_PARAMETER',
            "Parameter 'page' must be a positive integer greater than or equal to 1.",
            'traffic',
            requestId
          )
        );
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json(
          createErrorEnvelope(
            'INVALID_PARAMETER',
            "Parameter 'limit' must be between 1 and 100.",
            'traffic',
            requestId
          )
        );
      }

      const result = taskhubService.getTraffic({
        window: String(windowParam),
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        endpoint: endpoint ? String(endpoint) : undefined,
        method: method ? String(method) : undefined,
        statusCode: statusCode ? String(statusCode) : undefined,
        page: pageNum,
        limit: limitNum,
      });

      return res.status(200).json(
        createSuccessEnvelope(result.buckets, 'traffic', requestId, {
          page: result.page,
          limit: result.limit,
          total: result.totalBuckets,
          hasMore: result.hasMore,
        })
      );
    } catch (error: any) {
      logger.error('[TASKHUB API] Traffic retrieval error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'TRAFFIC_RETRIEVAL_FAILED',
          error.message || 'Failed to aggregate traffic metrics',
          'traffic',
          requestId
        )
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 5. GET /api/integration/v1/deployments
  // ---------------------------------------------------------------------------
  public async getDeployments(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const result = taskhubService.getDeployments();
      return res.status(200).json(
        createSuccessEnvelope(result.deployments, 'deployments', requestId, {
          page: 1,
          limit: result.deployments.length,
          total: result.total,
          hasMore: false,
        })
      );
    } catch (error: any) {
      logger.error('[TASKHUB API] Deployments retrieval error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'DEPLOYMENTS_RETRIEVAL_FAILED',
          error.message || 'Failed to retrieve deployment status',
          'deployments',
          requestId
        )
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 6. GET /api/integration/v1/diagnostics (Restricted read-only diagnostics)
  // ---------------------------------------------------------------------------
  public async getDiagnostics(req: AuthenticatedTaskHubRequest, res: Response) {
    const requestId = req.requestId || (res.getHeader('X-Request-ID') as string) || 'req_unknown';
    try {
      const diagnostics = await taskhubService.getDiagnostics();
      return res.status(200).json(
        createSuccessEnvelope(diagnostics, 'diagnostics', requestId)
      );
    } catch (error: any) {
      logger.error('[TASKHUB API] Diagnostics error:', error);
      return res.status(500).json(
        createErrorEnvelope(
          'DIAGNOSTICS_FAILED',
          error.message || 'Failed to generate system diagnostics',
          'diagnostics',
          requestId
        )
      );
    }
  }
}

export const taskhubController = new TaskHubController();
export default taskhubController;
