import fs from 'fs';

let code = fs.readFileSync('server/src/routes/admin.ts', 'utf-8');

// Use setting table for generic getSetting
code = code.replace(/prisma\.themeSetting\.findUnique\(\{ where: \{ keyName \} \}\)/g, 'prisma.setting.findUnique({ where: { settingKey: keyName } })');
code = code.replace(/record\.value/g, 'record.settingData');
code = code.replace(/prisma\.themeSetting\.upsert\(\{[\s\S]*?\}\);/g, `prisma.setting.upsert({
    where: { settingKey: keyName },
    update: { settingData: valueStr },
    create: { settingKey: keyName, settingData: valueStr },
  });`);

// Delete section 1 to 5
code = code.replace(/\/\/ -+\n\/\/ 1\. STORE SETTINGS[\s\S]*?(?=\/\/ -+\n\/\/ 6\. CMS PAGES)/, '');

// Delete section 8 FAQS
code = code.replace(/\/\/ -+\n\/\/ 8\. CMS FAQS OPERATIONS[\s\S]*?(?=\/\/ -+\n\/\/ 10\. DYNAMIC HOMEPAGE)/, '');

// Delete section 10
code = code.replace(/\/\/ -+\n\/\/ 10\. DYNAMIC HOMEPAGE BUILDER[\s\S]*?(?=\/\/ -+\n\/\/ 11\. CENTRALIZED API)/, '');

fs.writeFileSync('server/src/routes/admin.ts', code);
console.log('Fixed admin.ts');
