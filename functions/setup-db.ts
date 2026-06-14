import { execSync } from 'node:child_process';
import { getDatabaseUrl } from './src/config/env';

const DATABASE_URL = getDatabaseUrl();
process.stdout.write('Deploying Prisma Schema...\n');
try {
  execSync(`npx prisma db push --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });
} catch (e) {
  process.exit(1);
}
