import prisma from '../config/database';
import {
  getAppEnv,
  getFirebaseProjectId,
  sanitizeTokenForLog,
  AppEnvironment,
} from '../config/notificationEnv';

export type DeliveryFailureReason =
  | 'NO_ELIGIBLE_TOKENS'
  | 'WRONG_ENVIRONMENT'
  | 'WRONG_FIREBASE_PROJECT'
  | 'INVALID_TOKEN'
  | 'PERMISSION_NOT_GRANTED'
  | 'FCM_SEND_FAILURE'
  | 'UNAUTHORIZED_RECIPIENT'
  | 'DUPLICATE_NOTIFICATION'
  | 'NOTIFICATIONS_DISABLED';

export interface DiagnosticLogPayload {
  category: string;
  eventKey?: string;
  recipientType: 'ADMIN' | 'CUSTOMER' | 'BROADCAST' | 'GUEST';
  eligibleTokenCount: number;
  environment?: AppEnvironment;
  projectId?: string;
  success: boolean;
  failureReason?: DeliveryFailureReason | string;
  errorDetails?: any;
  sentTokens?: string[];
  failedTokens?: string[];
  actionUrl?: string | null;
  title?: string;
  bodySnippet?: string;
}

export class NotificationDiagnostics {
  /**
   * Records a sanitized diagnostic delivery attempt in the database and structured logger.
   */
  public static async recordAttempt(params: DiagnosticLogPayload): Promise<void> {
    const env = params.environment || getAppEnv();
    const projectId = params.projectId || getFirebaseProjectId();
    const timestamp = new Date();

    const sanitizedFailed = (params.failedTokens || []).map(sanitizeTokenForLog);
    const sanitizedSent = (params.sentTokens || []).map(sanitizeTokenForLog);

    const logEntry = {
      category: params.category,
      eventKey: params.eventKey || params.category,
      recipientType: params.recipientType,
      environment: env,
      projectId,
      eligibleTokens: params.eligibleTokenCount,
      success: params.success,
      failureReason: params.failureReason || null,
      sanitizedSentTokens: sanitizedSent,
      sanitizedFailedTokens: sanitizedFailed,
      errorDetails: params.errorDetails
        ? typeof params.errorDetails === 'string'
          ? params.errorDetails
          : params.errorDetails.message || JSON.stringify(params.errorDetails)
        : null,
      timestamp: timestamp.toISOString(),
    };

    // 1. Console structured log (avoid leaking complete tokens)
    if (params.success) {
      console.log(
        `[FCM Diagnostics] SUCCESS [${env}] [${params.category}] ` +
        `Tokens: ${params.eligibleTokenCount}, Recipient: ${params.recipientType}, Project: ${projectId}`
      );
    } else {
      console.warn(
        `[FCM Diagnostics] FAILURE [${env}] [${params.category}] ` +
        `Reason: ${params.failureReason || 'UNKNOWN'}, Recipient: ${params.recipientType}, ` +
        `Eligible: ${params.eligibleTokenCount}, Error: ${logEntry.errorDetails || 'N/A'}`
      );
    }

    // 2. Persist to PostgreSQL NotificationLog table
    try {
      await prisma.notificationLog.create({
        data: {
          title: params.title || `[${env.toUpperCase()}] ${params.category}`,
          body: params.bodySnippet || `FCM ${params.recipientType} dispatch (${params.eligibleTokenCount} tokens)`,
          type: params.eventKey || params.category,
          actionUrl: params.actionUrl || null,
          status: params.success ? 'DELIVERED' : 'FAILED',
          deliveryStatus: params.success
            ? `SUCCESS: ${params.eligibleTokenCount} tokens targeted on ${env}`
            : `FAILED (${params.failureReason}): ${logEntry.errorDetails || 'No details'}`,
          payload: {
            environment: env,
            projectId,
            recipientType: params.recipientType,
            failureReason: params.failureReason,
            sanitizedSampleTokens: sanitizedSent.slice(0, 5),
          } as any,
          response: {
            sanitizedFailedTokens: sanitizedFailed.slice(0, 5),
            error: logEntry.errorDetails,
          } as any,
        },
      });
    } catch (e: any) {
      console.warn('[FCM Diagnostics] DB persistence warn:', e?.message || e);
    }
  }
}
