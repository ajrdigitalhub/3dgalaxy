import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { ENV, getDatabaseUrl } from './env';

// PostgreSQL connection pool module
export const pool = new Pool({
  user: ENV.PG_USER,
  host: ENV.PG_HOST,
  database: ENV.PG_DATABASE,
  password: ENV.PG_PASSWORD,
  port: ENV.PG_PORT,
  ssl: ENV.PG_SSL,
});

// Automatic reconnect handling and error logging
pool.on('error', (err: Error) => {
  console.error('Unexpected database error on idle client', err);
});

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

export default prisma;
