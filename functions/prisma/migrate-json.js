const fs = require('fs');
let schema = fs.readFileSync('server/prisma/schema.prisma', 'utf-8');

schema = schema.replace(/Json/g, 'String');

fs.writeFileSync('server/prisma/schema.prisma', schema);
console.log('Migrated Json to String in schema');
