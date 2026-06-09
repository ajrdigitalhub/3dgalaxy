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

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (ENV.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
