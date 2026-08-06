import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';

const safeParseArray = (val: any): any[] => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

export const getPackagingSlipPDF = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const customData = req.body || {};

  try {
    let orderWhere: any;
    if (id.startsWith('B3D-') || id.startsWith('ORD-')) {
      orderWhere = { orderNumber: id };
    } else {
      orderWhere = { id };
    }

    const order = await prisma.order.findUnique({
      where: orderWhere,
      include: {
        customer: {
          include: { user: true },
        },
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: {
              include: {
                brand: true,
              },
            },
            variant: true,
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order && !customData.items) {
      return res.status(404).json({ error: 'Order record not found for Packaging Slip generation' });
    }

    const orderCode = customData.orderNumber || order?.orderNumber || order?.id || id;
    const easyId = customData.easyId || `ESUS${(orderCode || '').replace(/[^0-9]/g, '') || '2026217234'}`;
    const dateStr = customData.dateStr || (order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    
    // Extract & Format Shipping Address
    let addr: any = order?.shippingAddress || {};
    if (typeof order?.shippingAddress === 'string') {
      try {
        addr = JSON.parse(order.shippingAddress);
      } catch (e) {}
    }

    const recipientName = customData.shipToName || addr.name || [order?.customer?.user?.firstName, order?.customer?.user?.lastName].filter(Boolean).join(' ') || (order as any)?.customerName || 'Valued Customer';
    const streetLine = customData.shipToStreet || [addr.addressLine1 || addr.street, addr.addressLine2, addr.landmark].filter(Boolean).join(', ') || '8 8 8, Mettu Street, pathirapuliyur village';
    const cityStateZip = customData.shipToCityStateZip || [addr.city, addr.state, addr.postalCode || addr.pincode].filter(Boolean).join(', ') || 'tindivanam, Tamil Nadu - 604304';
    const countryStr = customData.shipToCountry || addr.country || 'India';
    const recipientPhone = addr.phone || order?.customer?.phone || order?.customer?.user?.mobile || '';
    const emailStr = customData.email || addr.email || order?.customer?.user?.email || (order as any)?.customerEmail || 'customer@example.com';

    // Currency Formatting
    const currencySymbol = customData.currencySymbol || '₹';
    const currencyCode = customData.currencyCode || 'INR';

    // Shipment details
    const shipmentObj: any = (order?.shipments && order.shipments.length > 0) ? order.shipments[0] : (typeof order?.shipment === 'object' ? order.shipment : null);
    const trackingStr = customData.trackingNumber || shipmentObj?.trackingNumber || 'LZ92738101';
    const returnAddressStr = customData.returnAddress || '3D Galaxy Labs India\n123 Tech Park, Electronic City\nBangalore, KA 560100, India';

    // Items List
    let itemsList: any[] = [];
    if (customData.items && Array.isArray(customData.items) && customData.items.length > 0) {
      itemsList = customData.items.map((i: any) => ({
        qty: Number(i.qty || i.quantity || 1),
        sku: String(i.sku || 'SKU-001'),
        description: String(i.description || i.productName || i.name || 'Product'),
        price: Number(i.price || i.unitPrice || 0),
        extPrice: Number(i.extPrice || i.totalPrice || (Number(i.price || 0) * Number(i.qty || 1))),
      }));
    } else if (order?.items) {
      itemsList = order.items.map((item: any) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.unitPrice || 0);
        let variantLabel = '';
        if (item.variant?.name) {
          variantLabel = ` (${item.variant.name})`;
        }
        return {
          qty,
          sku: item.variant?.sku || item.product?.sku || 'SKU-001',
          description: `${item.product?.name || item.name || 'Item'}${variantLabel}`,
          price,
          extPrice: Number(item.totalPrice || (price * qty)),
        };
      });
    }

    if (itemsList.length === 0) {
      itemsList = [
        { qty: 1, sku: 'anycubic-water-wash-resin-2-0-1kg-clear', description: 'Anycubic Water-Wash Resin 2.0 1kg (clear)', price: 1999.00, extPrice: 1999.00 },
      ];
    }

    const showPricing = customData.showPricing !== undefined ? Boolean(customData.showPricing) : true;
    const notesFromSender = customData.notesFromSender || (order?.notes ? `Note: "${order.notes}"` : 'Thank you for your order with 3D Galaxy!');
    const notesFromShipping = customData.notesFromShipping || (shipmentObj?.shippingNotes ? shipmentObj.shippingNotes : 'Fragile 3D printed items. Handle with care.');
    const shippingCost = Number(customData.shippingCost !== undefined ? customData.shippingCost : (order?.shippingAmount || 1.00));

    // Calculate totals
    const qtyTotal = itemsList.reduce((sum, item) => sum + item.qty, 0);
    const subTotal = itemsList.reduce((sum, item) => sum + item.extPrice, 0);
    const grandTotal = subTotal + shippingCost;

    // ----------------------------------------------------
    // Construct PDFKit Document (A4 Portrait, clean design)
    // ----------------------------------------------------
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Packing Slip - ${orderCode}`,
        Author: '3D Galaxy Warehouse',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PackingSlip-${orderCode}.pdf"`);

    doc.pipe(res);

    const startX = 40;
    const pageWidth = 515;
    let y = 40;

    // TOP HEADER BANNER
    // Left: EASYID & ESUS Number
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text('EASYID', startX, y);
    y += 12;
    doc.fillColor('#000000').fontSize(24).font('Helvetica-Bold').text(easyId, startX, y);

    // Right: Logo
    const logoX = startX + pageWidth - 90;
    doc.save();
    doc.fillColor('#F59E0B');
    doc.polygon([logoX + 25, y], [logoX + 45, y + 10], [logoX + 45, y + 30], [logoX + 25, y + 40], [logoX + 5, y + 30], [logoX + 5, y + 10]);
    doc.fill();
    doc.restore();
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('3D Galaxy', logoX - 10, y + 42, { width: 70, align: 'center' });

    y += 55;

    // Top Divider Line
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#333333').lineWidth(1).stroke();
    y += 15;

    // Subheader Centered Title
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('Packing Slip', startX, y, { width: pageWidth, align: 'center' });
    y += 28;

    // METADATA GRID SECTION (2 Columns with DYNAMIC Y offsets to avoid collisions)
    const col1X = startX;
    const col2X = startX + 250;
    const metaY = y;

    // Left Column (Ship To & Email)
    let leftY = metaY;
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Date:', col1X, leftY);
    doc.font('Helvetica').text(dateStr, col1X + 65, leftY);
    leftY += 18;

    doc.font('Helvetica-Bold').text('Ship To:', col1X, leftY);
    
    // Build Ship To String
    const addressParts = [
      recipientName,
      recipientPhone ? `Contact: ${recipientPhone}` : null,
      streetLine,
      cityStateZip,
      countryStr
    ].filter(Boolean);
    const shipToText = addressParts.join('\n');

    doc.font('Helvetica').text(shipToText, col1X + 65, leftY, { width: 175 });
    
    // DYNAMIC HEIGHT CALCULATION FOR SHIP TO
    const shipToHeight = doc.heightOfString(shipToText, { width: 175 });
    leftY += Math.max(shipToHeight, 40) + 12;

    doc.font('Helvetica-Bold').text('Email:', col1X, leftY);
    doc.font('Helvetica').text(emailStr, col1X + 65, leftY, { width: 175 });
    leftY += 20;

    // Right Column (Tracking, Return Address, Order)
    let rightY = metaY;
    doc.font('Helvetica-Bold').text('Tracking', col2X, rightY);
    doc.font('Helvetica').text(trackingStr, col2X + 75, rightY);
    rightY += 18;

    doc.font('Helvetica-Bold').text('Return\nAddress:', col2X, rightY);
    doc.font('Helvetica').text(returnAddressStr, col2X + 75, rightY, { width: 175 });

    const returnHeight = doc.heightOfString(returnAddressStr, { width: 175 });
    rightY += Math.max(returnHeight, 40) + 12;

    doc.font('Helvetica-Bold').text('Order:', col2X, rightY);
    doc.font('Helvetica').text(`#${orderCode.replace(/^#/, '')}`, col2X + 75, rightY);
    rightY += 20;

    y = Math.max(leftY, rightY) + 15;

    // ITEMS TABLE HEADER
    const colQtyW = 45;
    const colSkuW = 120;
    const colDescW = showPricing ? 190 : 350;
    const colPriceW = showPricing ? 80 : 0;
    const colExtPriceW = showPricing ? 80 : 0;

    const xQty = startX;
    const xSku = startX + colQtyW;
    const xDesc = xSku + colSkuW;
    const xPrice = xDesc + colDescW;
    const xExtPrice = xPrice + colPriceW;

    doc.rect(startX, y, pageWidth, 22).strokeColor('#000000').lineWidth(1.5).stroke();
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');

    doc.text('Qty', xQty, y + 6, { width: colQtyW, align: 'center' });
    doc.text('SKU', xSku + 8, y + 6, { width: colSkuW - 10, align: 'left' });
    doc.text('Description', xDesc + 8, y + 6, { width: colDescW - 10, align: 'left' });
    if (showPricing) {
      doc.text('Price', xPrice, y + 6, { width: colPriceW - 8, align: 'right' });
      doc.text('Ext. Price', xExtPrice, y + 6, { width: colExtPriceW - 8, align: 'right' });
    }

    y += 22;

    // TABLE ROWS WITH DYNAMIC ROW HEIGHT (Prevents SKU overlap)
    itemsList.forEach((item) => {
      // Calculate wrapped text heights
      const skuH = doc.heightOfString(item.sku, { width: colSkuW - 10 });
      const descH = doc.heightOfString(item.description, { width: colDescW - 10 });
      const rowHeight = Math.max(skuH, descH, 18) + 10;

      doc.fillColor('#000000').fontSize(9.5).font('Helvetica');
      doc.text(String(item.qty), xQty, y + 5, { width: colQtyW, align: 'center' });
      doc.text(item.sku, xSku + 8, y + 5, { width: colSkuW - 10 });
      doc.text(item.description, xDesc + 8, y + 5, { width: colDescW - 10 });
      if (showPricing) {
        doc.text(`${currencySymbol}${item.price.toFixed(2)}`, xPrice, y + 5, { width: colPriceW - 8, align: 'right' });
        doc.text(`${currencySymbol}${item.extPrice.toFixed(2)}`, xExtPrice, y + 5, { width: colExtPriceW - 8, align: 'right' });
      }

      y += rowHeight;

      // Dotted horizontal line under row
      doc.save();
      doc.moveTo(startX, y).lineTo(startX + pageWidth, y).dash(2, { space: 2 }).strokeColor('#888888').lineWidth(0.75).stroke();
      doc.restore();

      y += 4;
    });

    y += 8;

    // TOTALS SECTION BELOW TABLE
    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    doc.text(`Qty Total: ${qtyTotal}`, startX + 5, y);

    if (showPricing) {
      const totalsX = startX + pageWidth - 210;
      doc.font('Helvetica').text('Sub Total', totalsX, y, { width: 95, align: 'right' });
      doc.font('Helvetica-Bold').text(`${currencyCode} ${subTotal.toFixed(2)}`, totalsX + 105, y, { width: 105, align: 'right' });
      y += 18;

      doc.font('Helvetica').text('Shipping Cost', totalsX, y, { width: 95, align: 'right' });
      doc.font('Helvetica-Bold').text(`${currencyCode} ${shippingCost.toFixed(2)}`, totalsX + 105, y, { width: 105, align: 'right' });
      y += 18;

      doc.font('Helvetica').text('Total', totalsX, y, { width: 95, align: 'right' });
      doc.font('Helvetica-Bold').text(`${currencyCode} ${grandTotal.toFixed(2)}`, totalsX + 105, y, { width: 105, align: 'right' });
      y += 25;
    } else {
      y += 25;
    }

    // Divider Line above Notes
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#333333').lineWidth(1.5).stroke();
    y += 15;

    // NOTES FROM SENDER
    if (notesFromSender) {
      doc.font('Helvetica-Bold').fontSize(9.5).text('Notes from the\nSender:', startX, y, { width: 110 });
      doc.font('Helvetica').fontSize(9.5).text(notesFromSender, startX + 120, y, { width: pageWidth - 120 });
      
      const senderH = doc.heightOfString(notesFromSender, { width: pageWidth - 120 });
      y += Math.max(senderH, 24) + 12;

      doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#888888').lineWidth(0.75).stroke();
      y += 15;
    }

    // NOTES FROM LISSHIPMENT / WAREHOUSE
    if (notesFromShipping) {
      doc.font('Helvetica-Bold').fontSize(9.5).text('Notes from\nLisShipment:', startX, y, { width: 110 });
      doc.font('Helvetica').fontSize(9.5).text(notesFromShipping, startX + 120, y, { width: pageWidth - 120 });
      y += 30;
    }

    doc.end();
  } catch (error: any) {
    console.error('[PACKAGING_SLIP_ERROR] Failed to generate packaging slip PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate Packaging Slip PDF', details: error.message });
    }
  }
};
