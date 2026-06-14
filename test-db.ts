import prisma from './server/src/config/database'; prisma.brand.findMany().then(b => console.log(b)).catch(e => console.error(e));
