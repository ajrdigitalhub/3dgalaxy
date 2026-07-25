import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV } from './env';

// PostgreSQL connection pool module configured for high concurrency and cloud pooler stability
export const pool = new Pool({
  user: ENV.PG_USER,
  host: ENV.PG_HOST,
  database: ENV.PG_DATABASE,
  password: ENV.PG_PASSWORD,
  port: ENV.PG_PORT,
  ssl: ENV.PG_SSL ? { rejectUnauthorized: false } : false,
  max: ENV.PG_POOL_MAX, // Default 15 connection limit for active API requests
  idleTimeoutMillis: ENV.PG_IDLE_TIMEOUT_MS, // Retain idle sockets up to 30s
  connectionTimeoutMillis: ENV.PG_CONN_TIMEOUT_MS, // Allow up to 15s to establish socket / get available client
  keepAlive: true, // Send TCP keepalive probes to prevent cloud poolers from dropping idle connections
  keepAliveInitialDelayMillis: 10000,
});

// Automatic reconnect handling and error logging
pool.on('error', (err: Error) => {
  console.error('Unexpected database error on idle client', err);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

export default prisma;
