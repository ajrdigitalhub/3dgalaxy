import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from '@prisma/client';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
  const themeSettings = await prisma.themeSetting.findMany();
  console.log('ThemeSettings:', JSON.stringify(themeSettings, null, 2));

  const settings = await prisma.setting.findMany();
  console.log('Settings:', JSON.stringify(settings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
