import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV } from './env';

// PostgreSQL connection pool — tuned for Cloud Run serverless stability with Supabase PgBouncer Transaction Mode
export const pool = new Pool({
  user: ENV.PG_USER,
  host: ENV.PG_HOST,
  database: ENV.PG_DATABASE,
  password: ENV.PG_PASSWORD,
  port: ENV.PG_PORT,
  ssl: ENV.PG_SSL ? { rejectUnauthorized: false } : false,
  // Allow adequate concurrent connections for homepage and multi-query requests
  max: Math.min(20, Math.max(5, ENV.PG_POOL_MAX || 10)),
  // Give PgBouncer and Supabase enough time to assign a backend on cold starts and remote latency (20s)
  connectionTimeoutMillis: Math.max(15000, ENV.PG_CONN_TIMEOUT_MS || 20000),
  // Keep idle connections alive for 30s before recycling. PgBouncer will reuse them
  // within a request burst, preventing repeated TCP handshake overhead.
  idleTimeoutMillis: Math.max(10000, ENV.PG_IDLE_TIMEOUT_MS || 30000),
  maxUses: 200, // Recycle sockets periodically to prevent stale TCP accumulation
  keepAlive: true, // TCP keepalive to prevent cloud NAT from silently dropping idle connections
  keepAliveInitialDelayMillis: 10000,
  // IMPORTANT: Do NOT set allowExitOnIdle on Cloud Run — it destroys the pool
  // after idleTimeoutMillis of zero connections, forcing a cold TCP reconnect on every burst.
  allowExitOnIdle: false,
});

// Automatic reconnect handling and error logging
pool.on('error', (err: Error) => {
  console.warn('⚠️ Idle database client connection closed/reset by server:', err.message);
});

// Self-healing database schema check: Ensures mandatory columns like `is_featured` exist on live database
pool.query(`
  ALTER TABLE IF EXISTS product_categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
  ALTER TABLE IF EXISTS product_categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
  ALTER TABLE IF EXISTS product_categories ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
`).catch(err => {
  console.warn('⚠️ Auto-schema check notice:', err.message);
});

/**
 * Executes a database operation with automatic retry on transient connection drops or timeouts.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
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
        msg.includes('etimedout') ||
        msg.includes('econnreset') ||
        msg.includes('epipe') ||
        msg.includes('closed') ||
        msg.includes('unexpectedly') ||
        msg.includes('connection pool timed out') ||
        msg.includes('server has closed the connection') ||
        code === 'P1001' ||
        code === 'P1017' ||
        code === 'P2024';

      if (isConnError && attempt <= retries) {
        const wait = delayMs * attempt;
        console.warn(`⚠️ DB connection drop/timeout (attempt ${attempt}/${retries + 1}). Retrying in ${wait}ms... [${code || msg.slice(0, 60)}]`);
        await new Promise(r => setTimeout(r, wait));
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
        is_featured BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (product_id, category_id)
      );
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
      CREATE INDEX IF NOT EXISTS idx_product_categories_is_primary ON product_categories(is_primary);
      CREATE INDEX IF NOT EXISTS idx_product_categories_is_featured ON product_categories(is_featured);
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
        // Retry all Prisma operations on transient connection errors (cold-start, PgBouncer eviction)
        return withDbRetry(() => query(args), 3, 300);
      }
    }
  }
}) as unknown as PrismaClient;

export default prisma;
