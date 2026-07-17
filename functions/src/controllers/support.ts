import { Request, Response } from 'express';
import prisma from '../config/database';

export const generateSupportMessage = async (req: Request, res: Response) => {
  try {
    const { orderId, issueType, subject, description } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: { user: true }
        },
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const settingsRecord = await prisma.themeSetting.findUnique({
      where: { keyName: 'global-settings' },
    });
    const settingsVal = (settingsRecord?.value as any) || {};
    const supportPhone = settingsVal.support_phone || settingsVal.whatsappSettings?.adminPhoneNumber || '919999999999';

    const customerName = order.customer
      ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ')
      : 'Customer';

    const itemsText = order.items
      ?.map((i: any) => `${i.product?.name} (Qty: ${i.quantity})`)
      .join(', ') || '';

    const text = `Hi 3D Galaxy Team! I need support with my Order ID: ${order.orderNumber}.\nCustomer: ${customerName}\nItems: ${itemsText}\nIssue category: ${issueType || 'General'}\nSubject: ${subject || 'Support Request'}\nDetails: ${description || ''}`;
    
    const formattedPhone = supportPhone.replace(/[\s\+\-]/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;

    return res.status(200).json({
      success: true,
      data: {
        whatsappUrl,
        message: text,
        phone: supportPhone
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
