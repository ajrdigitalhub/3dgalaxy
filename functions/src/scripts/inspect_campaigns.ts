import prisma from '../config/database';

async function main() {
  const allSettings = await prisma.setting.findMany({
    select: { id: true, settingKey: true }
  });
  console.log('All setting keys:', allSettings.map(s => s.settingKey));

  for (const s of allSettings) {
    const data = await prisma.setting.findUnique({ where: { settingKey: s.settingKey } });
    const keys = Object.keys(data?.settingData as any || {});
    console.log(`Setting [${s.settingKey}] keys:`, keys);
    if ((data?.settingData as any)?.advertisements) {
      console.log(`Found advertisements in [${s.settingKey}]:`, (data?.settingData as any).advertisements.length);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
