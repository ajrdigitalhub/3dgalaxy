const fs = require('fs');
let schema = fs.readFileSync('server/prisma/schema.prisma', 'utf-8');

const modelsToRemove = [
  'Banner',
  'HomepageSection',
  'HomepageSectionItem',
  'ThemeSetting',
  'SearchSettings',
  'PaymentGateway',
  'FooterGeneralSetting',
  'FooterGroup',
  'FooterLink',
  'FooterSocialLink',
  'FooterNewsletterSetting',
  'FooterPaymentIcon',
  'FooterTrustBadge'
];

for (const model of modelsToRemove) {
  const regex = new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}\\n?`, 'g');
  schema = schema.replace(regex, '');
}

const settingModel = `
model Setting {
  id          String   @id @default(uuid())
  settingKey  String   @unique @map("setting_key")
  settingData String   @map("setting_data")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("settings")
}
`;

if (!schema.includes('model Setting {')) {
  schema += settingModel;
}

fs.writeFileSync('server/prisma/schema.prisma', schema);
console.log('Schema updated successfully');
