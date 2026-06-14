const { onRequest } = require('firebase-functions/v2/https');

// Correct Path: Pointing to the compiled bundle, NOT ./src/app
const mod = require('./dist/server.js');
const app = mod.default || mod;

// Production Export 
// Firebase automatically loads the variables from your .env file into process.env
exports.api = onRequest({ 
  cors: true,
  memory: "512MiB",       // Allocated extra overhead for Prisma engine binary processing
  timeoutSeconds: 60     // Gives the Supabase database connection plenty of time to warm up
}, app);
// Standalone Mock Server Layer
// if (!process.env.FUNCTIONS_EMULATOR && !process.env.K_SERVICE) {
//     const PORT = process.env.PORT || 8080;
//     app.listen(PORT, () => {
//         console.log(`🚀 [MOCK SERVER] Running at http://localhost:${PORT}`);
//     });
// }