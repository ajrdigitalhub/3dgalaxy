import prisma from './src/config/database';

async function testCreateOrder() {
  try {
    const product = await prisma.product.findFirst({
      include: { variants: true }
    });

    if (!product) {
      console.error("No products found in DB. Cannot test order creation.");
      return;
    }

    console.log(`Testing order creation with product: ${product.name} (ID: ${product.id})`);

    const items = [
      {
        productId: product.id,
        variantId: product.variants[0]?.id || null,
        quantity: 1
      }
    ];

    const payload: any = {
      customerType: 'GUEST',
      guestName: 'John Doe',
      guestEmail: `john-${Date.now()}@example.com`,
      guestPhone: '9876543210',
      guestSessionId: 'session_test_123',
      items,
      shippingAddress: {
        addressLine1: '123 Test Street',
        addressLine2: 'Apt 45',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      paymentMethod: 'RAZORPAY'
    };

    const resolvedName = payload.guestName;
    const resolvedEmail = payload.guestEmail;
    const resolvedPhone = payload.guestPhone;
    const resolvedAddress: any = payload.shippingAddress;
    const isGuest = true;

    // Resolve or create Customer record
    let customerIdToUse: string | null = null;

    const email = resolvedEmail;
    const name = resolvedName;
    const phone = resolvedPhone;

    let guestUser = await prisma.user.findFirst({ where: { email } });
    if (!guestUser) {
      let guestRole = await prisma.role.findFirst({ where: { name: 'Guest' } });
      if (!guestRole) {
        guestRole = await prisma.role.create({
          data: { name: 'Guest', description: 'Guest customer role' }
        });
      }
      guestUser = await prisma.user.create({
        data: {
          email,
          firstName: name.split(' ')[0] || 'Guest',
          lastName: name.split(' ').slice(1).join(' ') || 'Customer',
          passwordHash: '',
          isActive: true,
          roles: {
            create: {
              roleId: guestRole.id
            }
          }
        }
      });
    }

    let guestCust = await prisma.customer.findFirst({ where: { userId: guestUser.id } });
    if (!guestCust) {
      guestCust = await prisma.customer.create({
        data: {
          userId: guestUser.id,
          phone,
          customerType: 'guest'
        }
      });
    }
    customerIdToUse = guestCust.id;

    console.log(`Created/Resolved customer ID: ${customerIdToUse}`);

    // Run transaction
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-2026-${randomSuffix.toString().padStart(6, '0')}`;

    console.log(`Order number to create: ${orderNumber}`);

    const result = await prisma.$transaction(async (tx) => {
      let shippingAddressId: string | null = null;
      let billingAddressId: string | null = null;

      if (resolvedAddress) {
        const isObj = typeof resolvedAddress === 'object' && resolvedAddress !== null;
        const addrLine1 = isObj ? (resolvedAddress.addressLine1 || resolvedAddress.address || 'N/A') : resolvedAddress;
        const addrLine2 = isObj ? (resolvedAddress.addressLine2 || '') : '';
        const city = isObj ? (resolvedAddress.city || 'N/A') : 'City';
        const state = isObj ? (resolvedAddress.state || 'N/A') : 'State';
        const postalCode = isObj ? (resolvedAddress.postalCode || resolvedAddress.pincode || 'N/A') : '100001';
        const country = isObj ? (resolvedAddress.country || 'India') : 'India';

        const shipAddr = await tx.customerAddress.create({
          data: {
            customerId: customerIdToUse!,
            addressLine1: addrLine1,
            addressLine2: addrLine2,
            city,
            state,
            postalCode,
            country,
            isDefault: true
          }
        });
        shippingAddressId = shipAddr.id;
        billingAddressId = shipAddr.id;
      }

      let subtotal = 0;
      const parsedItems = [];

      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod) throw new Error(`Product not found: ${it.productId}`);

        let price = prod.salePrice ? Number(prod.salePrice) : Number(prod.basePrice);

        if (it.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } });
          if (variant) price = Number(variant.price);
        }

        subtotal += price * it.quantity;
        parsedItems.push({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity: it.quantity,
          unitPrice: price,
          totalPrice: price * it.quantity
        });
      }

      const shippingAmount = subtotal > 1000 ? 0 : 99;
      const taxAmount = 0;
      const discountAmount = 0;
      const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;

      const orderEntity = await tx.order.create({
        data: {
          customerId: customerIdToUse,
          orderNumber,
          totalAmount,
          taxAmount,
          shippingAmount,
          discountAmount,
          status: 'Pending',
          shippingAddressId,
          billingAddressId,
          items: { create: parsedItems },
          statusHistory: {
            create: [{ status: 'Pending', comments: 'Guest Order created', createdBy: null }]
          },
          payments: {
            create: [{ paymentMethod: payload.paymentMethod, amount: totalAmount, status: 'Pending' }]
          }
        },
        include: { items: true, payments: true }
      });

      return orderEntity;
    });

    console.log("SUCCESS! Order created:", result);
  } catch (error) {
    console.error("Order creation failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateOrder();
