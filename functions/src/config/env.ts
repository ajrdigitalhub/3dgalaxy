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
if (!process.env.APP_FIREBASE_STORAGE_BUCKET) {
  process.env.APP_FIREBASE_STORAGE_BUCKET = 'ajr3dgalaxy.firebasestorage.app';
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
  PG_CONN_TIMEOUT_MS: Number(process.env.PG_CONN_TIMEOUT_MS || 20000),
  SITE_URL: (process.env.APP_URL || process.env.SITE_URL || process.env.WEBSITE_URL || 'https://3dgalaxy.co').replace(/\/+$/, ''),
  SITE_NAME: process.env.SITE_NAME || process.env.STORE_NAME || '3D Galaxy',
  ADMIN_APP_URL: (process.env.ADMIN_APP_URL || process.env.ADMIN_URL || 'https://admin.3dgalaxy.in').replace(/\/+$/, ''),
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@3dgalaxy.co.in',
  CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/+$/, ''),
  BACKUP_MODULE_ENABLED: process.env.BACKUP_MODULE_ENABLED !== 'false',
  BACKUP_ENABLED: process.env.BACKUP_ENABLED !== 'false',
  BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || 'twice-weekly',
  BACKUP_DAY: process.env.BACKUP_DAY || 'Sunday',
  BACKUP_DAYS: process.env.BACKUP_DAYS || 'Wednesday,Sunday',
  BACKUP_TIME: process.env.BACKUP_TIME || '02:00',
  BACKUP_TIMEZONE: process.env.BACKUP_TIMEZONE || 'Asia/Kolkata',
  BACKUP_RETENTION_COUNT: Number(process.env.BACKUP_RETENTION_COUNT || 8),
  BACKUP_STORAGE_ROOT: (process.env.BACKUP_STORAGE_ROOT || 'db_backups').replace(/^\/+|\/+$/g, ''),
  CRON_SECRET: process.env.CRON_SECRET || '3dgalaxy_cron_secret_key_2026',
  APP_ENV: (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase(),
  APP_ORIGIN: (process.env.APP_ORIGIN || process.env.APP_URL || process.env.SITE_URL || 'https://3dgalaxy.co').replace(/\/+$/, ''),
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ajr3dgalaxy',
  FCM_NOTIFICATIONS_ENABLED: process.env.FCM_NOTIFICATIONS_ENABLED !== 'false',
  TASKHUB_INTEGRATION_ENABLED: process.env.TASKHUB_INTEGRATION_ENABLED !== 'false',
  TASKHUB_INTEGRATION_API_KEY: process.env.TASKHUB_INTEGRATION_API_KEY || 'th_sec_3dgalaxy_prod_live_9f8b2c4e1a',
  TASKHUB_INTEGRATION_API_KEY_SECONDARY: process.env.TASKHUB_INTEGRATION_API_KEY_SECONDARY || '',
  TASKHUB_INTEGRATION_KEY_ID: process.env.TASKHUB_INTEGRATION_KEY_ID || 'th_key_3dgalaxy_01',
  TASKHUB_INTEGRATION_ALLOWED_RESOURCES: (process.env.TASKHUB_INTEGRATION_ALLOWED_RESOURCES || 'health,metrics,logs,traffic,deployments')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  TASKHUB_APPLICATION_ID: process.env.TASKHUB_APPLICATION_ID || '3dgalaxy',
  TASKHUB_ENVIRONMENT: process.env.TASKHUB_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV || 'production',
  TASKHUB_ERROR_INGESTION_URL: process.env.TASKHUB_ERROR_INGESTION_URL || null,
};

export const getDatabaseUrl = () => {
  const user = encodeURIComponent(ENV.PG_USER);
  const password = encodeURIComponent(ENV.PG_PASSWORD);
  const sslMode = ENV.PG_SSL ? 'require' : 'disable';
  return `postgresql://${user}:${password}@${ENV.PG_HOST}:${ENV.PG_PORT}/${ENV.PG_DATABASE}?schema=public&sslmode=${sslMode}&pgbouncer=true`;
};

// Always ensure DATABASE_URL matches current ENV configuration
process.env.DATABASE_URL = getDatabaseUrl();

