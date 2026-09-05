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
  max: Math.max(20, ENV.PG_POOL_MAX || 20),
  idleTimeoutMillis: ENV.PG_IDLE_TIMEOUT_MS || 30000,
  connectionTimeoutMillis: ENV.PG_CONN_TIMEOUT_MS || 25000,
  maxUses: 7500, // Recycle pooled sockets to prevent stale TCP socket accumulation
  keepAlive: true, // Send TCP keepalive probes to prevent cloud poolers from dropping idle connections
  keepAliveInitialDelayMillis: 2000,
  allowExitOnIdle: true, // Allow Node process to exit when idle (critical for Cloud Functions inspection)
});

// Automatic reconnect handling and error logging
pool.on('error', (err: Error) => {
  console.warn('⚠️ Idle database client connection closed/reset by server:', err.message);
});

/**
 * Executes a database operation with automatic retry on transient connection drops or timeouts.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 200): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      const code = err?.code || '';
      const isConnError =
        msg.includes('connection terminated') ||
        msg.includes('connection timeout') ||
        msg.includes('timeout exceeded') ||
        msg.includes('econnreset') ||
        msg.includes('epipe') ||
        msg.includes('closed') ||
        msg.includes('unexpectedly') ||
        code === 'P1001' ||
        code === 'P1017' ||
        code === 'P2024';

      if (isConnError && attempt <= retries) {
        console.warn(`⚠️ DB connection drop/timeout detected (attempt ${attempt}/${retries + 1}). Retrying query in ${delayMs * attempt}ms...`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

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

// Table initialization can be invoked on startup or migration, avoid top-level DDL execution on module import
// initProductCategoriesTable();

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

const basePrisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        return withDbRetry(() => query(args), 2, 200);
      }
    }
  }
}) as unknown as PrismaClient;

export default prisma;
