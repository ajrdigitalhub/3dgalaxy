import app from './app';
import { ENV } from './config/env';

const PORT = ENV.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 DECOUPLED BACKEND ENGINE IN SERVICE`);
  console.log(`🌐 PORT: ${PORT}`);
  console.log(`📄 Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`===============================================`);
});

