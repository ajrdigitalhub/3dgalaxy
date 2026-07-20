import app from './app';
import { ENV } from './config/env';
import { startScheduler } from './services/scheduler';

const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 DECOUPLED BACKEND ENGINE IN SERVICE`);
  console.log(`🌐 PORT: ${PORT}`);
  console.log(`📄 Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`===============================================`);
  
  // Start the push campaign queue & scheduling daemon
  startScheduler();
});
