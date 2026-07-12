import app from './app';
import { ENV } from './config/env';
import { startRetryWorker } from './controllers/whatsapp';
import { startAbandonedCheckoutRecoveryWorker } from './controllers/abandonedCheckout';

const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 DECOUPLED BACKEND ENGINE IN SERVICE`);
  console.log(`🌐 PORT: ${PORT}`);
  console.log(`📄 Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`===============================================`);
  
  // Start background WhatsApp Retry Worker queue
  startRetryWorker();

  // Start background Abandoned Checkout scanner
  startAbandonedCheckoutRecoveryWorker();
});
