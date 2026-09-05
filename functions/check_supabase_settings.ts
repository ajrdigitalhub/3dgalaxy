import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from '@prisma/client';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

import { WhatsAppConversationService } from './src/services/whatsappConversationService';

async function main() {
  const convCount = await prisma.whatsappConversation.count();
  const msgCount = await prisma.whatsappMessage.count();
  console.log(`Conversations: ${convCount}, Messages: ${msgCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
