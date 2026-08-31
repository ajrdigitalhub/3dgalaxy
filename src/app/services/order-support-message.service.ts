import { Injectable, inject } from '@angular/core';
import { SettingsService } from '../core/services/settings.service';
import { formatWhatsAppNumber, buildWhatsAppUrl } from '../shared/utils/phone.utils';

export interface SupportQuestion {
  id: string;
  label: string;
  options: string[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderSupportMessageService {
  private settingsService = inject(SettingsService);

  public readonly defaultEmailRecipient = '3dgalaxy@hotmail.com';

  /**
   * List of all 16 support topics.
   * Can prioritize relevant items based on order status, while keeping ALL options accessible.
   */
  getSupportTopics(status?: string): string[] {
    const allTopics = [
      'Where is my order?',
      'Order delivery delay',
      'Tracking information',
      'Product damaged',
      'Wrong product received',
      'Missing item',
      'Product not working',
      'Product information',
      'Payment related issue',
      'COD related question',
      'Return request',
      'Refund request',
      'Exchange request',
      'Cancel my order',
      'Order modification',
      'Other'
    ];

    const st = (status || '').toLowerCase();

    // Prioritization logic based on status
    if (['delivered'].includes(st)) {
      const priority = [
        'Product damaged',
        'Wrong product received',
        'Missing item',
        'Product not working',
        'Return request',
        'Refund request',
        'Exchange request'
      ];
      const rest = allTopics.filter(t => !priority.includes(t) && t !== 'Cancel my order');
      return [...priority, ...rest];
    } else if (['shipped', 'processing', 'packed', 'confirmed', 'pending'].includes(st)) {
      const priority = [
        'Where is my order?',
        'Tracking information',
        'Order delivery delay',
        'Cancel my order',
        'Order modification',
        'Payment related issue'
      ];
      const rest = allTopics.filter(t => !priority.includes(t));
      return [...priority, ...rest];
    }

    return allTopics;
  }

  /**
   * Returns dynamic 1-2 questions for the selected support topic.
   */
  getQuestionsForTopic(topic: string): SupportQuestion[] {
    switch (topic) {
      case 'Where is my order?':
        return [
          {
            id: 'q1',
            label: 'What would you like to know?',
            options: [
              'Current order status',
              'Tracking details',
              'Expected delivery date',
              'Delivery delay',
              'Other'
            ]
          }
        ];

      case 'Order delivery delay':
        return [
          {
            id: 'q1',
            label: 'Has your estimated delivery date passed?',
            options: [
              'Yes, delivery date passed',
              'No, but delay notification received',
              'Delivery date is today',
              'Not sure'
            ]
          },
          {
            id: 'q2',
            label: 'What is your main concern?',
            options: [
              'Urgent delivery required',
              'Request delivery update',
              'Request carrier callback',
              'Other'
            ]
          }
        ];

      case 'Tracking information':
        return [
          {
            id: 'q1',
            label: 'What tracking help do you need?',
            options: [
              'Tracking link not working / invalid AWB',
              'Tracking status not updating',
              'Package marked delivered but not received',
              'Need carrier contact info',
              'Other'
            ]
          }
        ];

      case 'Product damaged':
        return [
          {
            id: 'q1',
            label: 'When did you receive the product?',
            options: [
              'Today',
              '1–2 days ago',
              '3–7 days ago',
              'More than 7 days ago'
            ]
          },
          {
            id: 'q2',
            label: 'Condition:',
            options: [
              'Product damaged',
              'Packaging damaged',
              'Both product and packaging',
              'Not sure'
            ]
          }
        ];

      case 'Wrong product received':
        return [
          {
            id: 'q1',
            label: 'What did you receive?',
            options: [
              'Different product altogether',
              'Wrong color / material / size',
              'Incorrect quantity',
              'Other'
            ]
          }
        ];

      case 'Missing item':
        return [
          {
            id: 'q1',
            label: 'Which item is missing?',
            options: [
              'Main product missing',
              'Accessory or part missing',
              'Entire package missing',
              'Multiple items missing'
            ]
          }
        ];

      case 'Product not working':
        return [
          {
            id: 'q1',
            label: 'What issue are you experiencing?',
            options: [
              'Product defective / broken',
              'Does not fit description',
              'Electrical / mechanical failure',
              'Quality not as expected',
              'Other'
            ]
          }
        ];

      case 'Product information':
        return [
          {
            id: 'q1',
            label: 'What information do you need?',
            options: [
              'Material & print specs',
              'Usage / Assembly instructions',
              'Warranty / Support info',
              'Technical specifications',
              'Other'
            ]
          }
        ];

      case 'Payment related issue':
        return [
          {
            id: 'q1',
            label: 'What payment issue are you facing?',
            options: [
              'Payment deducted but order not confirmed',
              'Payment failed',
              'Payment status incorrect',
              'Refund not received',
              'COD related question',
              'Other'
            ]
          }
        ];

      case 'COD related question':
        return [
          {
            id: 'q1',
            label: 'What is your COD query?',
            options: [
              'Change COD to Online payment',
              'Exact cash requirement query',
              'COD verification help',
              'Other'
            ]
          }
        ];

      case 'Return request':
        return [
          {
            id: 'q1',
            label: 'Reason for Return:',
            options: [
              'Damaged product',
              'Wrong product',
              'Defective product',
              'Product not as expected',
              'Missing item',
              'Ordered by mistake',
              'Other'
            ]
          }
        ];

      case 'Refund request':
        return [
          {
            id: 'q1',
            label: 'Reason for Refund:',
            options: [
              'Damaged product',
              'Wrong product',
              'Defective product',
              'Product not as expected',
              'Missing item',
              'Order cancelled',
              'Other'
            ]
          }
        ];

      case 'Exchange request':
        return [
          {
            id: 'q1',
            label: 'Reason for Exchange:',
            options: [
              'Size / Dimension incorrect',
              'Color / Material change',
              'Damaged / Defective item',
              'Other'
            ]
          }
        ];

      case 'Cancel my order':
        return [
          {
            id: 'q1',
            label: 'Reason for Cancellation:',
            options: [
              'Delivery time too long',
              'Ordered by mistake',
              'Changed my mind',
              'Want to change shipping address / items',
              'Other'
            ]
          }
        ];

      case 'Order modification':
        return [
          {
            id: 'q1',
            label: 'What would you like to modify?',
            options: [
              'Change shipping address',
              'Change contact phone / email',
              'Change product color / material',
              'Add / Remove item',
              'Other'
            ]
          }
        ];

      case 'Other':
      default:
        return [
          {
            id: 'q1',
            label: 'How can we best assist you?',
            options: [
              'General inquiry',
              'Feedback / Compliment',
              'Urgent escalation',
              'Other'
            ]
          }
        ];
    }
  }

  /**
   * Generates the formatted customer support message dynamically based on order details & user selections.
   */
  generateSupportMessage(
    order: any,
    topic: string,
    answers: Record<string, string>,
    additionalDetails: string,
    customerNameFallback?: string
  ): string {
    if (!order) return '';

    const orderId = order.orderNumber || order.id || 'N/A';
    const orderStatus = order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Confirmed';
    
    // Formatted Order Date
    let orderDate = 'N/A';
    if (order.createdAt) {
      try {
        orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        orderDate = String(order.createdAt);
      }
    }

    // Customer Contact Details
    const custName = customerNameFallback || order.shippingAddress?.fullName || order.guestName || order.customer?.user?.name || [order.customer?.user?.firstName, order.customer?.user?.lastName].filter(Boolean).join(' ') || 'Customer';
    const custPhone = order.shippingAddress?.phone || order.guestPhone || order.customer?.phone || order.customer?.user?.mobile || 'N/A';
    const custEmail = order.shippingAddress?.email || order.guestEmail || order.customer?.user?.email || order.customerEmail || 'N/A';

    // Products Summary
    let productsSummary = 'N/A';
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      productsSummary = order.items
        .map((i: any) => {
          const name = i.product?.name || i.name || 'Item';
          const qty = i.quantity || 1;
          const variant = i.variant?.name ? ` (${i.variant.name})` : '';
          return `• ${name}${variant} x${qty}`;
        })
        .join('\n');
    }

    // Payment Info
    const orderAmount = order.grandTotal ? `₹${Number(order.grandTotal).toLocaleString('en-IN')}` : 'N/A';
    const paymentMethod = order.paymentMethod || order.payments?.[0]?.paymentMethod || 'Online Payment';
    const paymentStatus = order.paymentStatus || order.payments?.[0]?.status || 'Paid';

    // Dynamic Q&A Answers string
    const questions = this.getQuestionsForTopic(topic);
    const answersText = questions
      .map(q => {
        const ans = answers[q.id];
        return ans ? `• ${q.label} ${ans}` : null;
      })
      .filter(Boolean)
      .join('\n');

    // Additional Details
    const cleanDetails = (additionalDetails || '').trim();

    // Assemble final message matching exact specs
    let msg = `Hello 3D Galaxy Support Team,\n\n`;
    msg += `I need assistance regarding my order.\n\n`;
    msg += `Order ID:\n${orderId}\n\n`;
    msg += `Order Date:\n${orderDate}\n\n`;
    msg += `Order Status:\n${orderStatus}\n\n`;

    if (topic) {
      msg += `Support Topic:\n${topic}\n\n`;
      if (answersText) {
        msg += `Issue / Details:\n${answersText}\n\n`;
      }
    }

    if (cleanDetails) {
      msg += `Additional Details:\n${cleanDetails}\n\n`;
    }

    msg += `Customer:\n${custName} (${custPhone})\n\n`;
    msg += `Thank you.`;

    return msg;
  }

  /**
   * Retrieves configured Admin WhatsApp Number from SettingsService.
   */
  getAdminWhatsAppNumber(): string {
    const raw = this.settingsService.whatsappSettings()?.adminPhoneNumber ||
                this.settingsService.whatsappSettings()?.adminPhone ||
                this.settingsService.contact()?.phone ||
                this.settingsService.settingsData()?.support_phone ||
                '919876543210';
    
    return formatWhatsAppNumber(raw, '919876543210');
  }

  /**
   * Generates wa.me URL for WhatsApp redirection.
   */
  generateWhatsAppUrl(whatsappNumber: string, message: string): string {
    const targetPhone = whatsappNumber || this.getAdminWhatsAppNumber();
    return buildWhatsAppUrl(targetPhone, message, '919876543210');
  }

  /**
   * Generates mailto URL for Email redirection.
   */
  generateEmailUrl(emailRecipient: string, orderId: string, message: string): string {
    const recipient = emailRecipient || this.defaultEmailRecipient;
    const subject = `Order Support - ${orderId || 'Request'}`;
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }
}
