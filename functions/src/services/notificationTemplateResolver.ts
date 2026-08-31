import { ENV } from '../config/env';
import { DeliveryEstimateService } from './deliveryEstimate.service';
import { WhatsAppNotificationService } from './whatsappNotificationService';

export interface ResolvedTemplateResult {
  shouldSend: boolean;
  templateName: string;
  type: 'COD' | 'PREPAID' | 'NONE';
  variables: {
    customerName: string;
    orderId: string;
    orderAmount: string;
    paymentMethod: string;
    paymentStatus: string;
    estimatedDeliveryDate: string;
    orderUrl: string;
    siteName: string;
  };
  rawValues: {
    isCod: boolean;
    isPaid: boolean;
    isCancelled: boolean;
    isFailed: boolean;
  };
}

export class NotificationTemplateResolver {
  /**
   * Helper to check if a payment method is Cash on Delivery (COD)
   */
  public static isCodPayment(paymentMethod?: string | null): boolean {
    if (!paymentMethod) return false;
    const lower = String(paymentMethod).trim().toLowerCase();
    return (
      lower === 'cod' ||
      lower === 'cash_on_delivery' ||
      lower === 'cash on delivery' ||
      lower === 'pay_on_delivery' ||
      lower === 'cash' ||
      lower === 'cod_payment'
    );
  }

  /**
   * Helper to check if an order has been successfully paid (prepaid)
   */
  public static isPaidOrder(order: any, extraParams: any = {}): boolean {
    if (!order) return false;
    if (order.paymentId && String(order.paymentId).trim().length > 0) return true;
    
    const statusStr = String(order.paymentStatus || extraParams?.paymentStatus || '').toUpperCase();
    if (statusStr === 'PAID' || statusStr === 'SUCCESS' || statusStr === 'COMPLETED') return true;

    const orderStatusStr = String(order.status || '').toUpperCase();
    if (orderStatusStr === 'PROCESSING' || orderStatusStr === 'PACKED' || orderStatusStr === 'SHIPPED' || orderStatusStr === 'DELIVERED') {
      const isCod = this.isCodPayment(order.paymentMethod || extraParams?.paymentMethod);
      if (!isCod) return true;
    }

    return false;
  }

  /**
   * Centralized Notification Template Resolver
   * Determines template selection & populates all 8 dynamic variables for COD & Prepaid orders.
   */
  public static async resolveOrderConfirmationTemplate(
    order: any,
    whatsappSettings: any = {},
    extraParams: any = {}
  ): Promise<ResolvedTemplateResult> {
    const siteName = whatsappSettings?.storeName || extraParams?.siteName || ENV.SITE_NAME;
    const siteUrl = extraParams?.origin || whatsappSettings?.siteUrl || ENV.SITE_URL;

    const orderId = order?.orderNumber || order?.id || extraParams?.orderId || 'N/A';
    const orderUrl = extraParams?.orderLink || `${siteUrl}/account/orders/${order?.id || orderId}`;

    // Customer Name Resolution
    const customerName = WhatsAppNotificationService.extractCustomerName(order, extraParams);

    // Amount Resolution (formatted as number without leading currency symbol, template contains ₹{{3}})
    const rawAmount = Number(order?.totalAmount || extraParams?.totalAmount || 0);
    const orderAmount = rawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Payment Method & Status Resolution
    const rawMethod = String(order?.paymentMethod || extraParams?.paymentMethod || '').toLowerCase();
    const isCod = this.isCodPayment(rawMethod);
    const isPaid = this.isPaidOrder(order, extraParams);

    const orderStatusUpper = String(order?.status || '').toUpperCase();
    const paymentStatusUpper = String(order?.paymentStatus || extraParams?.paymentStatus || '').toUpperCase();

    const isCancelled = orderStatusUpper === 'CANCELLED' || orderStatusUpper === 'CANCELED';
    const isFailed = paymentStatusUpper === 'FAILED' || orderStatusUpper === 'PAYMENT_FAILED';

    // Dynamic Delivery Date Calculation
    const estimatedDeliveryDate = await DeliveryEstimateService.calculateOrderDeliveryEstimate(order);

    // Business Rules Execution:
    // CASE 4: Cancelled Order -> No Order Confirmation
    if (isCancelled) {
      console.log(`[NotificationTemplateResolver] Suppressing order confirmation for cancelled order ${orderId}`);
      return this.buildResult(false, '', 'NONE', customerName, orderId, orderAmount, '', '', estimatedDeliveryDate, orderUrl, siteName, isCod, isPaid, isCancelled, isFailed);
    }

    // CASE 3: Payment Failed -> No Order Confirmation
    if (isFailed) {
      console.log(`[NotificationTemplateResolver] Suppressing order confirmation for failed payment on order ${orderId}`);
      return this.buildResult(false, '', 'NONE', customerName, orderId, orderAmount, '', '', estimatedDeliveryDate, orderUrl, siteName, isCod, isPaid, isCancelled, isFailed);
    }

    // CASE 1: Cash on Delivery (COD) Order
    if (isCod) {
      const templateName = whatsappSettings.orderConfirmationCodTemplateName || 'order_confirmation_cod_3dgal';
      const formattedMethod = 'Cash on Delivery (COD)';
      const formattedStatus = 'Pending ⏳ (COD)';

      return this.buildResult(
        true,
        templateName,
        'COD',
        customerName,
        orderId,
        orderAmount,
        formattedMethod,
        formattedStatus,
        estimatedDeliveryDate,
        orderUrl,
        siteName,
        isCod,
        isPaid,
        isCancelled,
        isFailed
      );
    }

    // CASE 2: Prepaid / Online Payment Order (Paid)
    if (isPaid || !isCod) {
      const templateName = whatsappSettings.orderConfirmationPaidTemplateName || 'order_confirmation_paid_3dgal';
      
      let formattedMethod = 'Online Payment';
      if (rawMethod.includes('razorpay')) formattedMethod = 'Online Payment (Razorpay)';
      else if (rawMethod.includes('phonepe')) formattedMethod = 'Online Payment (PhonePe)';
      else if (rawMethod.includes('upi')) formattedMethod = 'UPI Payment';
      else if (rawMethod.includes('card') || rawMethod.includes('credit') || rawMethod.includes('debit')) formattedMethod = 'Card Payment';
      else if (rawMethod.includes('netbanking')) formattedMethod = 'Net Banking';
      else if (rawMethod.includes('wallet')) formattedMethod = 'Wallet Payment';
      else if (rawMethod.length > 0) formattedMethod = rawMethod.toUpperCase();

      const formattedStatus = isPaid ? 'Paid ✅' : 'Paid';

      return this.buildResult(
        true,
        templateName,
        'PREPAID',
        customerName,
        orderId,
        orderAmount,
        formattedMethod,
        formattedStatus,
        estimatedDeliveryDate,
        orderUrl,
        siteName,
        isCod,
        isPaid,
        isCancelled,
        isFailed
      );
    }

    return this.buildResult(false, '', 'NONE', customerName, orderId, orderAmount, '', '', estimatedDeliveryDate, orderUrl, siteName, isCod, isPaid, isCancelled, isFailed);
  }

  private static buildResult(
    shouldSend: boolean,
    templateName: string,
    type: 'COD' | 'PREPAID' | 'NONE',
    customerName: string,
    orderId: string,
    orderAmount: string,
    paymentMethod: string,
    paymentStatus: string,
    estimatedDeliveryDate: string,
    orderUrl: string,
    siteName: string,
    isCod: boolean,
    isPaid: boolean,
    isCancelled: boolean,
    isFailed: boolean
  ): ResolvedTemplateResult {
    return {
      shouldSend,
      templateName,
      type,
      variables: {
        customerName,
        orderId,
        orderAmount,
        paymentMethod,
        paymentStatus,
        estimatedDeliveryDate,
        orderUrl,
        siteName,
      },
      rawValues: {
        isCod,
        isPaid,
        isCancelled,
        isFailed,
      },
    };
  }
}
