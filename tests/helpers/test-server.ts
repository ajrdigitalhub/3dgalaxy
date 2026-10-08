/**
 * 3D Galaxy Automated Regression Test Suite
 * In-Process Ephemeral Test Server
 */

// Set production environment to test real security, auth guards & interceptors
process.env.NODE_ENV = 'production';

import http from 'http';
import axios, { AxiosInstance } from 'axios';
import app from '../../functions/src/app';

let server: http.Server | null = null;
let client: AxiosInstance | null = null;
let serverPort = 0;

export async function startTestServer(): Promise<{ port: number; client: AxiosInstance; baseUrl: string }> {
  if (server && client) {
    return { port: serverPort, client, baseUrl: `http://127.0.0.1:${serverPort}` };
  }

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', () => {
      const address = server!.address() as any;
      serverPort = address.port;
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  client = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    validateStatus: () => true // Allow asserting any HTTP status code without throwing
  });

  return { port: serverPort, client, baseUrl };
}

export async function stopTestServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = null;
    client = null;
    serverPort = 0;
  }
}

export function getClient(): AxiosInstance {
  if (!client) {
    throw new Error('Test server has not been started. Call startTestServer() first.');
  }
  return client;
}
