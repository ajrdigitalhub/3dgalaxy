import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { getSettingsService } from '../modules/settings/settings.service';
import { uploadFileToStorage, getFirebaseDownloadUrl } from '../config/firebase';

export interface InvoiceOptions {
  forceRegenerate?: boolean;
  generatedBy?: string;
}

export class InvoiceService {
  /**
   * Generate sequential invoice number: INV-YYYY-XXXXXX
   */
  static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let sequence = 1;
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const parts = latestInvoice.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  /**
   * Log invoice audit action to audit_logs database
   */
  static async logAudit(userId: string | null, action: string, orderId: string, details: any) {
    try {
      const isUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      await prisma.auditLog.create({
        data: {
          userId: isUuid ? userId : null,
          action: action,
          entityType: 'INVOICE',
          entityId: orderId,
          newData: details || {},
        },
      });
    } catch (err: any) {
      console.warn('Invoice audit logging error:', err.message);
    }
  }

  /**
   * Build GST Tax Invoice PDF Buffer using PDFKit
   */
  static async buildInvoicePDFBuffer(
    order: any,
    invoiceNumber: string,
    invoiceStatus: string
  ): Promise<Buffer> {
    const settings = await getSettingsService();
    const company = settings.storeSettings || settings.companySettings || {};

    const companyName = settings.storeName || company.companyName || company.name || '3D GALAXY';
    const companyGstin = company.gstin || company.gstNumber || '27AAAAA0000A1Z5';
    const companyAddress = company.address || company.addressLine1 || 'Main Market, Industrial Zone, India';
    const companyEmail = company.email || settings.adminEmail || 'support@3dgalaxy.com';
    const companyPhone = company.phone || settings.adminPhoneNumber || '+91 99999 99999';
    const companyWebsite = settings.siteUrl || 'https://3dgalaxy.com';
    const bankDetails = company.bankDetails || 'Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234';

    const trackingUrl = `${companyWebsite}/track?order=${encodeURIComponent(order.orderNumber || order.id)}`;

    // Generate QR Code Buffer
    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(trackingUrl, {
        margin: 1,
        width: 100,
        color: { dark: '#111827', light: '#FFFFFF' },
      });
    } catch (e) {
      console.warn('QR Code generation failed:', e);
    }

    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 25, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (data) => buffers.push(data));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const isCancelled = order.status === 'CANCELLED' || invoiceStatus === 'CANCELLED';
      const isRefunded = order.status === 'REFUNDED' || invoiceStatus === 'REFUNDED';

      // --- WATERMARK (if Cancelled or Refunded) ---
      if (isCancelled || isRefunded) {
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(65);
        doc.fillColor(isCancelled ? '#EF4444' : '#F59E0B');
        doc.opacity(0.12);
        doc.text(isCancelled ? 'CANCELLED' : 'REFUNDED', 50, 380, { align: 'center', width: 500 });
        doc.restore();
        doc.opacity(1);
      }

      // --- HEADER SECTION ---
      doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(companyName, 35, 25);
      doc.fontSize(8.5).font('Helvetica').fillColor('#4B5563');
      doc.text(companyAddress, 35, 48, { width: 270 });
      doc.text(`GSTIN: ${companyGstin} | Email: ${companyEmail}`, 35, doc.y);
      doc.text(`Phone: ${companyPhone} | Web: ${companyWebsite}`, 35, doc.y);

      // TAX INVOICE Header Badge Right
      doc.fillColor('#D97706').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 350, 25, { align: 'right', width: 210 });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111827');
      doc.text(`Invoice No: ${invoiceNumber}`, 350, 48, { align: 'right', width: 210 });
      doc.font('Helvetica').fillColor('#4B5563');
      doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 350, 60, { align: 'right', width: 210 });
      doc.text(`Order No: ${order.orderNumber || order.id}`, 350, 72, { align: 'right', width: 210 });
      doc.text(`Payment: ${order.paymentMethod || 'Online'} (${order.paymentStatus || order.status})`, 350, 84, { align: 'right', width: 210 });

      doc.moveTo(35, 102).lineTo(560, 102).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // --- ADDRESSES SECTION ---
      let shippingAddr: any = order.shippingAddress;
      if (typeof shippingAddr === 'string') {
        try { shippingAddr = JSON.parse(shippingAddr); } catch { shippingAddr = null; }
      }
      let billingAddr: any = order.billingAddress || shippingAddr;
      if (typeof billingAddr === 'string') {
        try { billingAddr = JSON.parse(billingAddr); } catch { billingAddr = shippingAddr; }
      }

      const addressY = 110;
      // Bill To
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#111827').text('BILL TO:', 35, addressY);
      doc.fontSize(8.5).font('Helvetica-Bold').text(billingAddr?.name || order.customer?.firstName || 'Valued Customer', 35, addressY + 12);
      doc.font('Helvetica').fillColor('#4B5563');
      if (order.companyName) doc.text(`Company: ${order.companyName}`, 35, doc.y);
      if (order.gstNumber) doc.text(`GSTIN: ${order.gstNumber}`, 35, doc.y);
      doc.text(billingAddr?.addressLine1 || billingAddr?.address || 'N/A', 35, doc.y, { width: 240 });
      if (billingAddr?.city || billingAddr?.state) {
        doc.text(`${billingAddr.city || ''}, ${billingAddr.state || ''} - ${billingAddr.pincode || ''}`, 35, doc.y);
      }
      doc.text(`Phone: ${billingAddr?.phone || order.customer?.mobile || 'N/A'}`, 35, doc.y);

      // Ship To
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#111827').text('SHIP TO:', 310, addressY);
      doc.fontSize(8.5).font('Helvetica-Bold').text(shippingAddr?.name || 'Same as Billing', 310, addressY + 12);
      doc.font('Helvetica').fillColor('#4B5563');
      doc.text(shippingAddr?.addressLine1 || shippingAddr?.address || 'N/A', 310, doc.y, { width: 240 });
      if (shippingAddr?.city || shippingAddr?.state) {
        doc.text(`${shippingAddr.city || ''}, ${shippingAddr.state || ''} - ${shippingAddr.pincode || ''}`, 310, doc.y);
      }
      doc.text(`Phone: ${shippingAddr?.phone || 'N/A'}`, 310, doc.y);

      const tableStartY = Math.max(doc.y + 8, 185);
      doc.moveTo(35, tableStartY).lineTo(560, tableStartY).strokeColor('#E5E7EB').stroke();

      // --- PRODUCTS TABLE HEADER ---
      const tableHeaderY = tableStartY + 6;
      doc.rect(35, tableHeaderY - 3, 525, 18).fill('#F3F4F6');
      doc.fillColor('#111827').fontSize(8).font('Helvetica-Bold');
      doc.text('#', 40, tableHeaderY, { width: 18 });
      doc.text('Item Description', 62, tableHeaderY, { width: 230 });
      doc.text('SKU', 295, tableHeaderY, { width: 70 });
      doc.text('Qty', 368, tableHeaderY, { width: 30, align: 'center' });
      doc.text('Price (₹)', 402, tableHeaderY, { width: 65, align: 'right' });
      doc.text('Total (₹)', 472, tableHeaderY, { width: 83, align: 'right' });

      let currentY = tableHeaderY + 18;
      doc.font('Helvetica').fontSize(8).fillColor('#374151');

      let itemIndex = 1;
      const items = (order.items || []).slice(0, 12); // Limit to top 12 items on single page
      items.forEach((item: any) => {
        const prodName = item.product?.name || item.name || 'Custom Product Item';
        const variantName = item.variant?.name || item.variantName || '';
        const sku = item.variant?.sku || item.product?.sku || item.sku || 'N/A';
        const qty = item.quantity || 1;
        const unitPrice = Number(item.unitPrice || item.price || 0);
        const lineTotal = Number(item.totalPrice || qty * unitPrice);

        doc.text(String(itemIndex++), 40, currentY, { width: 18 });
        doc.font('Helvetica-Bold').text(prodName, 62, currentY, { width: 228 });
        if (variantName) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#6B7280').text(`Variant: ${variantName}`, 62, currentY + 9, { width: 228 });
          doc.fontSize(8).fillColor('#374151');
        }
        doc.font('Helvetica').text(sku, 295, currentY, { width: 70 });
        doc.text(String(qty), 368, currentY, { width: 30, align: 'center' });
        doc.text(unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 402, currentY, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').text(lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 472, currentY, { width: 83, align: 'right' });

        currentY += variantName ? 20 : 14;
        doc.moveTo(35, currentY - 2).lineTo(560, currentY - 2).strokeColor('#F9FAFB').stroke();
      });

      // --- SUMMARY & TOTALS BOX ---
      currentY += 4;
      doc.moveTo(35, currentY).lineTo(560, currentY).strokeColor('#E5E7EB').stroke();

      const summaryStartY = Math.min(currentY + 6, 600);
      const rightX = 350;
      const labelW = 110;
      const valW = 95;

      const subtotal = Number(order.totalAmount || 0) + Number(order.discountAmount || 0) - Number(order.taxAmount || 0) - Number(order.shippingAmount || 0) - Number(order.codCharge || 0);
      const discount = Number(order.discountAmount || 0);
      const shipping = Number(order.shippingAmount || 0);
      const codCharge = Number(order.codCharge || 0);
      const tax = Number(order.taxAmount || 0);
      const grandTotal = Number(order.totalAmount || 0);

      doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
      
      let sumY = summaryStartY;
      doc.text('Subtotal:', rightX, sumY, { width: labelW, align: 'right' });
      doc.text(`₹${Math.max(0, subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
      sumY += 12;

      if (discount > 0) {
        doc.text('Discount:', rightX, sumY, { width: labelW, align: 'right' });
        doc.text(`- ₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
        sumY += 12;
      }

      if (shipping > 0) {
        doc.text('Shipping:', rightX, sumY, { width: labelW, align: 'right' });
        doc.text(`₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
        sumY += 12;
      }

      if (codCharge > 0) {
        doc.text('COD Fee:', rightX, sumY, { width: labelW, align: 'right' });
        doc.text(`₹${codCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
        sumY += 12;
      }

      if (tax > 0) {
        const halfTax = tax / 2;
        doc.text('CGST (9%):', rightX, sumY, { width: labelW, align: 'right' });
        doc.text(`₹${halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
        sumY += 12;
        doc.text('SGST (9%):', rightX, sumY, { width: labelW, align: 'right' });
        doc.text(`₹${halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });
        sumY += 12;
      }

      doc.moveTo(rightX + 40, sumY).lineTo(560, sumY).strokeColor('#E5E7EB').stroke();
      sumY += 4;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
      doc.text('Grand Total:', rightX, sumY, { width: labelW, align: 'right' });
      doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sumY, { width: valW, align: 'right' });

      // --- QR CODE & BANK DETAILS (Bottom Left) ---
      if (qrBuffer) {
        doc.image(qrBuffer, 35, summaryStartY, { width: 60, height: 60 });
        doc.fontSize(7).font('Helvetica').fillColor('#6B7280');
        doc.text('Scan QR Code to Track Order', 35, summaryStartY + 64, { width: 140 });
      }

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#111827').text('Payment & Bank Information:', 35, summaryStartY + 76);
      doc.fontSize(7).font('Helvetica').fillColor('#4B5563').text(bankDetails, 35, summaryStartY + 86, { width: 280 });

      // --- FOOTER & TERMS ---
      const footerY = 770;
      doc.moveTo(35, footerY).lineTo(560, footerY).strokeColor('#E5E7EB').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#111827').text('Terms & Conditions:', 35, footerY + 5);
      doc.fontSize(7).font('Helvetica').fillColor('#6B7280').text('1. Goods once sold will be covered under standard 3D Galaxy manufacturer warranty.', 35, footerY + 15);
      doc.text('2. Please retain this invoice for warranty & return requests.', 35, footerY + 24);
      doc.text('This is a computer-generated tax invoice and requires no physical signature.', 35, footerY + 36, { align: 'center', width: 525 });

      doc.end();
    });
  }

  /**
   * Create or Retrieve Invoice record & Firebase Storage PDF
   */
  static async getOrCreateInvoice(
    orderId: string,
    userId: string | null = null,
    options: InvoiceOptions = {}
  ): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    let invoice = await prisma.invoice.findUnique({
      where: { orderId },
    });

    // Reuse cached invoice if not forcing regeneration
    if (invoice && !options.forceRegenerate && invoice.pdfDownloadUrl) {
      this.logAudit(userId, 'INVOICE_VIEWED', orderId, { invoiceNumber: invoice.invoiceNumber });
      return invoice;
    }

    const invoiceNumber = invoice?.invoiceNumber || (await this.generateInvoiceNumber());
    let invoiceStatus = 'ORIGINAL';
    if (order.status === 'CANCELLED') invoiceStatus = 'CANCELLED';
    if (order.status === 'REFUNDED') invoiceStatus = 'REFUNDED';
    if (invoice && invoice.version > 1) invoiceStatus = 'DUPLICATE';

    // Build PDF Buffer
    const pdfBuffer = await this.buildInvoicePDFBuffer(order, invoiceNumber, invoiceStatus);

    // Upload to Firebase Storage
    const storagePath = `invoices/${order.orderNumber || order.id}/invoice.pdf`;
    const downloadUrl = await uploadFileToStorage(pdfBuffer, storagePath, 'application/pdf');

    // Upsert Invoice Record in DB
    invoice = await prisma.invoice.upsert({
      where: { orderId },
      update: {
        invoiceStatus,
        pdfStoragePath: storagePath,
        pdfDownloadUrl: downloadUrl,
        version: { increment: 1 },
        generatedAt: new Date(),
        generatedBy: userId || 'SYSTEM',
      },
      create: {
        orderId,
        invoiceNumber,
        invoiceStatus,
        pdfStoragePath: storagePath,
        pdfDownloadUrl: downloadUrl,
        generatedBy: userId || 'SYSTEM',
        version: 1,
      },
    });

    // Also update order.invoiceUrl for legacy compatibility
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { invoiceUrl: downloadUrl },
      });
    } catch (err: any) {
      console.warn('Legacy order invoiceUrl update warning:', err.message);
    }

    const action = options.forceRegenerate ? 'INVOICE_REGENERATED' : 'INVOICE_GENERATED';
    this.logAudit(userId, action, orderId, { invoiceNumber, version: invoice.version });

    return invoice;
  }
}
