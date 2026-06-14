// Test: Does importing the app module block?
console.time('app-import');
const app = require('./dist/app').default;
console.timeEnd('app-import');
console.log('App imported successfully - NO BLOCKING');

// Test: Does importing Firebase Functions block?
console.time('firebase-functions');
const functions = require('firebase-functions');
console.timeEnd('firebase-functions');
console.log('Firebase Functions loaded - NO BLOCKING');

// Test: Does creating the HTTP function block?
console.time('create-function');
const api = functions.https.onRequest(app);
console.timeEnd('create-function');
console.log('Firebase HTTP Function created - NO BLOCKING');

console.log('\n✓ All modules loaded without blocking');
process.exit(0);
