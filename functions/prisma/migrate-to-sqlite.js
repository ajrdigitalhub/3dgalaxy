const fs = require('fs');
let schema = fs.readFileSync('server/prisma/schema.prisma', 'utf-8');

schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
schema = schema.replace(/url\s*=\s*".*"/, 'url = "file:./dev.db"');
schema = schema.replace(/@db\.\w+(\([^\)]*\))?/g, '');
schema = schema.replace(/Decimal/g, 'Float');

fs.writeFileSync('server/prisma/schema.prisma', schema);
console.log('Migrated schema to sqlite');
