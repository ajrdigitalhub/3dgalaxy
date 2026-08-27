import dotenv from 'dotenv';
import path from 'path';

// Explicitly load functions/.env with override: true regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'functions/.env'), override: true });

// Enforce active Supabase pooler host, user, and port if missing or set to deprecated direct host
if (!process.env.PG_HOST || process.env.PG_HOST === 'db.glaljifokncxzjvajzrg.supabase.co') {
  process.env.PG_HOST = 'aws-1-ap-northeast-1.pooler.supabase.com';
}
if (!process.env.PG_USER || process.env.PG_USER === 'postgres') {
  process.env.PG_USER = 'postgres.glaljifokncxzjvajzrg';
}
if (!process.env.PG_PORT || process.env.PG_PORT === '5432') {
  process.env.PG_PORT = '6543';
}

export const ENV = {
  PG_USER: process.env.PG_USER || 'postgres.glaljifokncxzjvajzrg',
  PG_HOST: process.env.PG_HOST || 'aws-1-ap-northeast-1.pooler.supabase.com',
  PG_DATABASE: process.env.PG_DATABASE || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'Mec170761$1',
  PG_PORT: Number(process.env.PG_PORT || 6543),
  PG_SSL: process.env.PG_SSL === 'false' ? false : true,
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
  return `postgresql://${user}:${password}@${ENV.PG_HOST}:${ENV.PG_PORT}/${ENV.PG_DATABASE}?schema=public&sslmode=${sslMode}&pgbouncer=true`;
};

// Always ensure DATABASE_URL matches current ENV configuration
process.env.DATABASE_URL = getDatabaseUrl();

