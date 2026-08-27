import './config/env';
import app from './app';
import { ENV } from './config/env';
import { startScheduler } from './services/scheduler';
import { loadFirebaseConfigFromDb } from './config/firebase';

const PORT = ENV.PORT;

app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`🚀 DECOUPLED BACKEND ENGINE IN SERVICE`);
  console.log(`🌐 PORT: ${PORT}`);
  console.log(`📄 Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`===============================================`);
  
  // Load dynamic Firebase credentials from settings table
  await loadFirebaseConfigFromDb();

  // Start background scheduler daemon
  startScheduler();
});
