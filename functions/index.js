
const functions = require('firebase-functions');
const mod = require('./dist/app');
const app = mod && mod.default ? mod.default : mod;

exports.api = functions.https.onRequest(app);