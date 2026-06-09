import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PG_USER: process.env.PG_USER || 'postgres',
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_DATABASE: process.env.PG_DATABASE || '3DGalaxy',
  PG_PASSWORD: process.env.PG_PASSWORD || '12345678',
  PG_PORT: Number(process.env.PG_PORT || 5432),
  PG_SSL: process.env.PG_SSL === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 4000,
};

export const getDatabaseUrl = () => {
  const user = encodeURIComponent(ENV.PG_USER);
  const password = encodeURIComponent(ENV.PG_PASSWORD);
  const sslMode = ENV.PG_SSL ? 'require' : 'disable';
  
  return `postgresql://${user}:${password}@${ENV.PG_HOST}:${ENV.PG_PORT}/${ENV.PG_DATABASE}?schema=public&sslmode=${sslMode}`;
};
