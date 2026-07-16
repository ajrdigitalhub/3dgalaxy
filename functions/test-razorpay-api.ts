import prisma from './src/config/database';

async function testRazorpay() {
  try {
    const record = await prisma.setting.findUnique({
      where: { settingKey: 'app_settings' }
    });
    const settings = (record?.settingData || {}) as any;
    const rzConfig = settings.paymentGatewaySettings?.paymentMethods?.razorpay;

    if (!rzConfig) {
      console.error("Razorpay config not found");
      return;
    }

    console.log("Testing Razorpay order creation with config:", {
      keyId: rzConfig.keyId,
      keySecret: rzConfig.keySecret ? "***" : "missing",
      enabled: rzConfig.enabled
    });

    const auth = Buffer.from(`${rzConfig.keyId}:${rzConfig.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: 100, // 1 INR in paise
        currency: 'INR',
        receipt: 'TEST_RECEIPT_123',
      }),
    });

    const data = await response.json();
    console.log("Status code:", response.status);
    console.log("Response data:", data);
  } catch (error) {
    console.error("Fetch failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRazorpay();
