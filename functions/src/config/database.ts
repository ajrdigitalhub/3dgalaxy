import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV } from './env';

// PostgreSQL connection pool module with max connection limit for session mode
export const pool = new Pool({
  user: ENV.PG_USER,
  host: ENV.PG_HOST,
  database: ENV.PG_DATABASE,
  password: ENV.PG_PASSWORD,
  port: ENV.PG_PORT,
  ssl: ENV.PG_SSL ? { rejectUnauthorized: false } : false,
  max: 5, // Keep under Supabase session mode pool_size limit (15)
  idleTimeoutMillis: 10000, // Close idle clients after 10s
  connectionTimeoutMillis: 5000, // Wait max 5s for an available client
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
