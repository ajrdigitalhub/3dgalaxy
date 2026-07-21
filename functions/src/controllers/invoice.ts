import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { InvoiceService } from '../services/invoice.service';

/**
 * Helper to verify order ownership or admin rights
 */
async function verifyInvoiceAccess(req: AuthenticatedRequest, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderNumber: orderId }
      ]
    },
    include: {
      customer: {
        include: { user: true }
      },
      items: {
        include: { product: true }
      },
      shippingAddress: true,
      billingAddress: true
    }
  });

  if (!order) {
    return { authorized: false, status: 404, message: 'Order not found', order: null };
  }

  const user = req.user;
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'SUPER-ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(userRole) || userRole.includes('ADMIN');

  if (isAdmin) {
    return { authorized: true, isAdmin: true, order };
  }

  // Ownership verification if authenticated
  if (user) {
    const userId = user.id;
    const isOwner =
      (order.customerId && (order.customerId === userId || order.customer?.userId === userId)) ||
      (user.email && (order.customer?.user?.email === user.email || (order.shippingAddress as any)?.email === user.email));

    if (!isOwner) {
      return { authorized: false, status: 403, message: 'You are not authorized to access this invoice.', order };
    }

    // Customer Rule: Invoice accessible ONLY when order status is DELIVERED
    const orderStatus = (order.status || '').toUpperCase();
    if (orderStatus !== 'DELIVERED') {
      return {
        authorized: false,
        status: 403,
        message: 'Invoice will be available after your order has been successfully delivered.',
        code: 'INVOICE_PENDING_DELIVERY',
        order
      };
    }

    return { authorized: true, isAdmin: false, order };
  }

  // Public / Stream access fallback when valid order exists
  return { authorized: true, isAdmin: false, order };
}

/**
 * Customer / Admin Get Invoice metadata or download URL
 */
export const getInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const access = await verifyInvoiceAccess(req, orderId);

    if (!access.authorized) {
      return res.status(access.status || 403).json({
        error: access.message,
        code: (access as any).code || 'FORBIDDEN'
      });
    }

    const userId = req.user?.id || null;
    const invoice = await InvoiceService.getOrCreateInvoice(orderId, userId);

    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    console.error('getInvoice error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve invoice' });
  }
};

/**
 * Stream PDF invoice for direct viewing or downloading
 */
export const streamInvoicePDF = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const isDownload = req.query.download === 'true' || req.query.dl === '1';

    const access = await verifyInvoiceAccess(req, orderId);
    if (!access.authorized) {
      return res.status(access.status || 403).send(access.message);
    }

    const userId = req.user?.id || null;
    const invoice = await InvoiceService.getOrCreateInvoice(orderId, userId);

    // Build PDF Buffer
    const pdfBuffer = await InvoiceService.buildInvoicePDFBuffer(access.order, invoice.invoiceNumber, invoice.invoiceStatus);

    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = `Invoice_${invoice.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    InvoiceService.logAudit(userId, isDownload ? 'INVOICE_DOWNLOADED' : 'INVOICE_VIEWED', orderId, {
      invoiceNumber: invoice.invoiceNumber,
      disposition
    });

    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('streamInvoicePDF error:', error);
    return res.status(500).json({ error: error.message || 'Failed to stream invoice PDF' });
  }
};

/**
 * Admin Generate Invoice Endpoint
 */
export const adminGenerateInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || null;

    const invoice = await InvoiceService.getOrCreateInvoice(orderId, userId, { forceRegenerate: true });

    return res.status(200).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (error: any) {
    console.error('adminGenerateInvoice error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate invoice' });
  }
};

/**
 * Admin Regenerate Invoice Endpoint
 */
export const adminRegenerateInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    const userId = req.user?.id || null;

    const invoice = await InvoiceService.getOrCreateInvoice(orderId, userId, { forceRegenerate: true });

    return res.status(200).json({
      success: true,
      message: 'Invoice regenerated successfully',
      data: invoice
    });
  } catch (error: any) {
    console.error('adminRegenerateInvoice error:', error);
    return res.status(500).json({ error: error.message || 'Failed to regenerate invoice' });
  }
};
