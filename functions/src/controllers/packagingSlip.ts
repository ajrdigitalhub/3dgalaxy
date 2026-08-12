import { Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let order: any = null;

    const includeOptions = {
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
        orderBy: { createdAt: 'desc' as const },
      },
    };

    if (isUuid) {
      order = await prisma.order.findUnique({
        where: { id },
        include: includeOptions,
      });
    }

    if (!order) {
      const formattedNum = id.startsWith('#') ? id : `#${id}`;
      const rawNum = id.replace(/^#/, '');
      order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: id },
            { orderNumber: formattedNum },
            { orderNumber: rawNum },
          ],
        },
        include: includeOptions,
      });
    }

    if (!order && !customData.items) {
      return res.status(404).json({ error: `Order record not found for ID or Order Number '${id}'` });
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

    // Helper to format currency for PDFKit without character encoding bugs
    const formatPdfCurrency = (amount: number, symbol: string = '₹') => {
      const formattedNum = Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      let safeSymbol = String(symbol || 'INR').trim();
      if (!safeSymbol || safeSymbol === '₹' || safeSymbol.includes('₹') || safeSymbol === 'Rs' || safeSymbol === 'Rs.') {
        safeSymbol = 'INR';
      }

      return `${safeSymbol} ${formattedNum}`;
    };

    const formatPdfTotal = (amount: number, code: string = 'INR') => {
      const formattedNum = Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${code} ${formattedNum}`;
    };

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
    const shippingCost = Number(customData.shippingCost !== undefined ? customData.shippingCost : (order?.shippingAmount !== undefined ? order.shippingAmount : 0));
    const codCharge = Number(customData.codCharge !== undefined ? customData.codCharge : (order?.codCharge !== undefined && order?.codCharge !== null ? order.codCharge : (order?.paymentMethod === 'COD' || order?.paymentMethod === 'cash_on_delivery' ? 100 : 0)));
    const taxAmount = Number(customData.taxAmount !== undefined ? customData.taxAmount : (order?.taxAmount || 0));
    const discountAmount = Number(customData.discountAmount !== undefined ? customData.discountAmount : (order?.discountAmount || 0));

    // Calculate totals
    const qtyTotal = itemsList.reduce((sum, item) => sum + item.qty, 0);
    const subTotal = itemsList.reduce((sum, item) => sum + item.extPrice, 0);
    const calculatedGrand = Math.max(0, subTotal + shippingCost + codCharge + taxAmount - discountAmount);
    const grandTotal = customData.grandTotal !== undefined ? Number(customData.grandTotal) : (order?.totalAmount && Number(order.totalAmount) > 0 ? Number(order.totalAmount) : calculatedGrand);

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
    const logoX = startX + pageWidth - 140;
    const logoCandidates = [
      path.resolve(__dirname, '../../../public/3d-logo.png'),
      path.resolve(process.cwd(), '../public/3d-logo.png'),
      path.resolve(process.cwd(), 'public/3d-logo.png')
    ];
    const logoPathToUse = logoCandidates.find(p => fs.existsSync(p));

    if (logoPathToUse) {
      try {
        doc.image(logoPathToUse, logoX, y - 5, { height: 40 });
      } catch (e) {
        doc.save();
        doc.fillColor('#F59E0B');
        doc.polygon([logoX + 25, y], [logoX + 45, y + 10], [logoX + 45, y + 30], [logoX + 25, y + 40], [logoX + 5, y + 30], [logoX + 5, y + 10]);
        doc.fill();
        doc.restore();
      }
    } else {
      doc.save();
      doc.fillColor('#F59E0B');
      doc.polygon([logoX + 25, y], [logoX + 45, y + 10], [logoX + 45, y + 30], [logoX + 25, y + 40], [logoX + 5, y + 30], [logoX + 5, y + 10]);
      doc.fill();
      doc.restore();
    }

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
    const colSkuW = 110;
    const colDescW = showPricing ? 170 : 360;
    const colPriceW = showPricing ? 95 : 0;
    const colExtPriceW = showPricing ? 95 : 0;

    const xQty = startX;
    const xSku = startX + colQtyW;
    const xDesc = xSku + colSkuW;
    const xPrice = xDesc + colDescW;
    const xExtPrice = xPrice + colPriceW;

    // Outer box and vertical lines for table header
    doc.rect(startX, y, pageWidth, 22).strokeColor('#000000').lineWidth(1.2).stroke();
    doc.moveTo(xSku, y).lineTo(xSku, y + 22).strokeColor('#000000').lineWidth(1).stroke();
    doc.moveTo(xDesc, y).lineTo(xDesc, y + 22).strokeColor('#000000').lineWidth(1).stroke();
    if (showPricing) {
      doc.moveTo(xPrice, y).lineTo(xPrice, y + 22).strokeColor('#000000').lineWidth(1).stroke();
      doc.moveTo(xExtPrice, y).lineTo(xExtPrice, y + 22).strokeColor('#000000').lineWidth(1).stroke();
    }

    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('Qty', xQty, y + 6, { width: colQtyW, align: 'center' });
    doc.text('SKU', xSku + 6, y + 6, { width: colSkuW - 12, align: 'left' });
    doc.text('Description', xDesc + 6, y + 6, { width: colDescW - 12, align: 'left' });
    if (showPricing) {
      doc.text('Price', xPrice, y + 6, { width: colPriceW - 8, align: 'right' });
      doc.text('Ext. Price', xExtPrice, y + 6, { width: colExtPriceW - 8, align: 'right' });
    }

    y += 22;

    // TABLE ROWS WITH FULL BORDER BOXES & VERTICAL DIVIDERS
    itemsList.forEach((item) => {
      const skuH = doc.heightOfString(item.sku, { width: colSkuW - 12 });
      const descH = doc.heightOfString(item.description, { width: colDescW - 12 });
      const rowHeight = Math.max(skuH, descH, 18) + 8;

      // Draw row outer rectangle
      doc.rect(startX, y, pageWidth, rowHeight).strokeColor('#000000').lineWidth(1).stroke();

      // Draw vertical column dividers
      doc.moveTo(xSku, y).lineTo(xSku, y + rowHeight).strokeColor('#000000').lineWidth(1).stroke();
      doc.moveTo(xDesc, y).lineTo(xDesc, y + rowHeight).strokeColor('#000000').lineWidth(1).stroke();
      if (showPricing) {
        doc.moveTo(xPrice, y).lineTo(xPrice, y + rowHeight).strokeColor('#000000').lineWidth(1).stroke();
        doc.moveTo(xExtPrice, y).lineTo(xExtPrice, y + rowHeight).strokeColor('#000000').lineWidth(1).stroke();
      }

      doc.fillColor('#000000').fontSize(9.5).font('Helvetica');
      doc.text(String(item.qty), xQty, y + 5, { width: colQtyW, align: 'center' });
      doc.text(item.sku, xSku + 6, y + 5, { width: colSkuW - 12 });
      doc.text(item.description, xDesc + 6, y + 5, { width: colDescW - 12 });
      if (showPricing) {
        doc.text(formatPdfCurrency(item.price, currencySymbol), xPrice, y + 5, { width: colPriceW - 8, align: 'right' });
        doc.text(formatPdfCurrency(item.extPrice, currencySymbol), xExtPrice, y + 5, { width: colExtPriceW - 8, align: 'right' });
      }

      y += rowHeight;
    });

    y += 8;

    // TOTALS SECTION BELOW TABLE
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text(`Qty Total: ${qtyTotal}`, startX + 5, y);

    if (showPricing) {
      const labelX = startX + pageWidth - 280;
      const valueX = startX + pageWidth - 130;
      const colW = 125;

      doc.fontSize(9.5);
      doc.font('Helvetica').text('Sub Total', labelX, y, { width: 140, align: 'right' });
      doc.font('Helvetica-Bold').text(formatPdfTotal(subTotal, currencyCode), valueX, y, { width: colW, align: 'right' });
      y += 16;

      if (shippingCost > 0 || (codCharge === 0 && taxAmount === 0 && discountAmount === 0)) {
        doc.font('Helvetica').text('Shipping Cost', labelX, y, { width: 140, align: 'right' });
        doc.font('Helvetica-Bold').text(formatPdfTotal(shippingCost, currencyCode), valueX, y, { width: colW, align: 'right' });
        y += 16;
      }

      if (codCharge > 0) {
        doc.font('Helvetica').text('COD Handling Charge', labelX, y, { width: 140, align: 'right' });
        doc.font('Helvetica-Bold').text(formatPdfTotal(codCharge, currencyCode), valueX, y, { width: colW, align: 'right' });
        y += 16;
      }

      if (taxAmount > 0) {
        doc.font('Helvetica').text('Tax', labelX, y, { width: 140, align: 'right' });
        doc.font('Helvetica-Bold').text(formatPdfTotal(taxAmount, currencyCode), valueX, y, { width: colW, align: 'right' });
        y += 16;
      }

      if (discountAmount > 0) {
        doc.font('Helvetica').text('Discount', labelX, y, { width: 140, align: 'right' });
        doc.font('Helvetica-Bold').text(`-${formatPdfTotal(discountAmount, currencyCode)}`, valueX, y, { width: colW, align: 'right' });
        y += 16;
      }

      doc.fontSize(10.5);
      doc.font('Helvetica-Bold').text('Total', labelX, y, { width: 140, align: 'right' });
      doc.font('Helvetica-Bold').text(formatPdfTotal(grandTotal, currencyCode), valueX, y, { width: colW, align: 'right' });
      y += 24;
    } else {
      y += 24;
    }

    // ANCHOR FOOTER NOTES TO BOTTOM OF PAGE (A4 height = 842pt)
    const minFooterY = 690;
    if (y < minFooterY) {
      y = minFooterY;
    }

    // Divider Line above Notes
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#000000').lineWidth(1.5).stroke();
    y += 15;

    // NOTES FROM SENDER
    if (notesFromSender) {
      doc.font('Helvetica-Bold').fontSize(9.5).text('Notes from the\nSender:', startX, y, { width: 110 });
      doc.font('Helvetica').fontSize(9.5).text(notesFromSender, startX + 120, y, { width: pageWidth - 120 });
      
      const senderH = doc.heightOfString(notesFromSender, { width: pageWidth - 120 });
      y += Math.max(senderH, 24) + 12;

      if (notesFromShipping) {
        doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#888888').lineWidth(0.75).stroke();
        y += 15;
      }
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
