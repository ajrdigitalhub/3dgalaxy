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
  max: ENV.PG_POOL_MAX, // Default 10 connection limit for active API requests
  idleTimeoutMillis: 10000, // Release idle connections quickly (10s) — cloud poolers drop them anyway
  connectionTimeoutMillis: ENV.PG_CONN_TIMEOUT_MS, // Allow up to 30s to establish socket / get available client
  keepAlive: true, // Send TCP keepalive probes to prevent cloud poolers from dropping idle connections
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true, // Let the pool shrink to 0 when idle — prevents stale sockets
});

// Automatic reconnect handling and error logging
pool.on('error', (err: Error) => {
  console.error('⚠️ Unexpected database error on idle client:', err.message);
  // Pool handles reconnection automatically for new queries — no process.exit needed
});

/**
 * Lightweight connection health check. Returns true if the pool can
 * successfully execute a trivial query, false otherwise. Used by the
 * scheduler to skip a tick instead of flooding logs with connection errors.
 */
export const initProductCategoriesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        sort_order INT NOT NULL DEFAULT 0,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (product_id, category_id)
      );
      CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
      CREATE INDEX IF NOT EXISTS idx_product_categories_is_primary ON product_categories(is_primary);
    `);
  } catch (err: any) {
    console.error('⚠️ Could not initialize product_categories table:', err.message);
  }
};

// Initialize table asynchronously
initProductCategoriesTable();

export const isPoolHealthy = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
};

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

export default prisma;
