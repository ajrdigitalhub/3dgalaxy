import dotenv from 'dotenv';
import path from 'path';

// Explicitly load functions/.env regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'functions/.env') });

// Sanitize/Fix legacy invalid Supabase host if present in environment
if (!process.env.PG_HOST || process.env.PG_HOST.includes('aws-1-ap-northeast-1.pooler.supabase.com')) {
  process.env.PG_HOST = 'db.glaljifokncxzjvajzrg.supabase.co';
}
if (!process.env.PG_USER || process.env.PG_USER === 'postgres.glaljifokncxzjvajzrg') {
  process.env.PG_USER = 'postgres';
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('aws-1-ap-northeast-1.pooler.supabase.com')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    'aws-1-ap-northeast-1.pooler.supabase.com',
    'db.glaljifokncxzjvajzrg.supabase.co'
  ).replace('postgres.glaljifokncxzjvajzrg', 'postgres');
}

export const ENV = {
  PG_USER: process.env.PG_USER || 'postgres',
  PG_HOST: process.env.PG_HOST || 'db.glaljifokncxzjvajzrg.supabase.co',
  PG_DATABASE: process.env.PG_DATABASE || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'Mec170761$1',
  PG_PORT: Number(process.env.PG_PORT || 5432),
  PG_SSL: process.env.PG_SSL === 'true' || true,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.BACKEND_PORT || 4000,
  PG_POOL_MAX: Number(process.env.PG_POOL_MAX || 10),
  PG_IDLE_TIMEOUT_MS: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  PG_CONN_TIMEOUT_MS: Number(process.env.PG_CONN_TIMEOUT_MS || 30000),
};

export const getDatabaseUrl = () => {
  const user = encodeURIComponent(ENV.PG_USER);
  const password = encodeURIComponent(ENV.PG_PASSWORD);
  const sslMode = ENV.PG_SSL ? 'require' : 'disable';
  // Disable the pg prepared statement cache and enable PgBouncer compatibility
  // for Supabase / PgBouncer connection pools.
  return `postgresql://${user}:${password}@${ENV.PG_HOST}:${ENV.PG_PORT}/${ENV.PG_DATABASE}?schema=public&sslmode=${sslMode}&statement_cache_size=0&pgbouncer=true`;
};
