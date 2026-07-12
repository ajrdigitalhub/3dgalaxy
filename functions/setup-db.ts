import { execSync } from 'node:child_process';
import { getDatabaseUrl } from './src/config/env';

let DATABASE_URL = getDatabaseUrl();
// Use direct session port 5432 instead of PgBouncer pooler port 6543 for migrations/DDL
DATABASE_URL = DATABASE_URL.replace(':6543/', ':5432/').replace('pgbouncer=true', 'pgbouncer=false');

process.stdout.write('Deploying Prisma Schema via direct port 5432...\n');
try {
  execSync(`npx prisma db push --accept-data-loss --schema=prisma/schema.prisma`, {
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });
} catch (e) {
  process.exit(1);
}
