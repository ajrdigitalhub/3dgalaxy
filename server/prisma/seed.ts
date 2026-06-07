import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding scenario...');

  // 1. Roles & Permissions seeding
  console.log('Creating Roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      permissions: ['all'],
    },
  });

  const dealerRole = await prisma.role.upsert({
    where: { name: 'DEALER' },
    update: {},
    create: {
      name: 'DEALER',
      permissions: ['read:products', 'create:orders', 'write:reviews'],
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: {
      name: 'CUSTOMER',
      permissions: ['read:products', 'create:orders', 'write:reviews'],
    },
  });

  // 2. Administrators seeding
  console.log('Registering Admin profile info...');
  const hashedAdminPassword = await bcrypt.hash('BrahmaGalaxyAdmin2026!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@brahma3d.com' },
    update: {},
    create: {
      email: 'admin@brahma3d.com',
      name: 'Brahma Chief Operator',
      password: hashedAdminPassword,
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
  });

  // 3. Brands seeding
  console.log('Creating Partner Brands...');
  const bambuBrand = await prisma.brand.upsert({
    where: { slug: 'bambu-lab' },
    update: {},
    create: {
      name: 'Bambu Lab',
      slug: 'bambu-lab',
      logo: 'https://picsum.photos/seed/bambu/300/100',
      banner: 'https://picsum.photos/seed/bambubanner/1200/400',
      description: 'Industry leading high-speed color desktop FDM fabricators',
    },
  });

  const crealityBrand = await prisma.brand.upsert({
    where: { slug: 'creality' },
    update: {},
    create: {
      name: 'Creality',
      slug: 'creality',
      logo: 'https://picsum.photos/seed/creality/300/100',
      description: 'Pioneering accessible, modifications-friendly desktop printers',
    },
  });

  const elegooBrand = await prisma.brand.upsert({
    where: { slug: 'elegoo' },
    update: {},
    create: {
      name: 'Elegoo',
      slug: 'elegoo',
      logo: 'https://picsum.photos/seed/elegoo/300/100',
      description: 'Ultra detailed LCD/MSLA high precision resin printers',
    },
  });

  // 4. Unlimited parent-child Category tree hierarchy seeding
  console.log('Seeding self-referential Category hierarchy tree...');

  // Top Level categories
  const printersCat = await prisma.category.create({
    data: { name: '3D Printers', slug: '3d-printers', description: 'Active fabrication nodes' },
  });

  const materialsCat = await prisma.category.create({
    data: { name: 'Materials', slug: 'materials', description: 'Consumable media filaments and resins' },
  });

  const sparePartsCat = await prisma.category.create({
    data: { name: 'Spare Parts', slug: 'spare-parts', description: 'Extruders, hotends, belts and auxiliary boards' },
  });

  // Level 1 Subcategories under 3D Printers
  const fdmCat = await prisma.category.create({
    data: { name: 'FDM Printers', slug: 'fdm-printers', parentId: printersCat.id },
  });

  const resinCat = await prisma.category.create({
    data: { name: 'Resin Printers', slug: 'resin-printers', parentId: printersCat.id },
  });

  // Level 2 Subcategories under FDM Printers
  const bambuCat = await prisma.category.create({
    data: { name: 'Bambu Lab Hardware', slug: 'bambu-lab-hardware', parentId: fdmCat.id },
  });

  const crealityCat = await prisma.category.create({
    data: { name: 'Creality Hardware', slug: 'creality-hardware', parentId: fdmCat.id },
  });

  // Level 1 Subcategories under Materials
  const filamentCat = await prisma.category.create({
    data: { name: 'Filaments', slug: 'filaments', parentId: materialsCat.id },
  });

  // Level 2 Subcategories under Filaments
  await prisma.category.createMany({
    data: [
      { name: 'PLA', slug: 'pla', parentId: filamentCat.id },
      { name: 'ABS', slug: 'abs', parentId: filamentCat.id },
      { name: 'PETG', slug: 'petg', parentId: filamentCat.id },
      { name: 'TPU', slug: 'tpu', parentId: filamentCat.id },
    ],
  });

  // 5. Products, Variants and SEO Metadata seeding
  console.log('Registering high performance hardware Products...');
  const bambuA1Product = await prisma.product.create({
    data: {
      name: 'Bambu Lab A1 Color Combo',
      slug: 'bambu-lab-a1-combo',
      sku: 'BML-A1-AMS',
      description: 'Multi-color printing right out of the box with AMS Lite feeder systems.',
      mrp: 599.0,
      salePrice: 499.0,
      dealerPrice: 429.0,
      stock: 40,
      categoryId: bambuCat.id,
      brandId: bambuBrand.id,
      is360Supported: true,
      seoTitle: 'Bambu Lab A1 with AMS Lite Feeder | Best 3D Printer',
      seoDescription: 'Order the genuine Bambu Lab A1 Color multi-filament desktop 3D printer now with wholesale distribution benefits.',
      seoKeywords: 'Bambu, A1, MultiColor, desktop, 3D Printer, AMS',
      variants: {
        create: [
          { name: 'Standard A1 Combo', price: 499.0, stock: 25, sku: 'BML-A1-COMBO-STD' },
          { name: 'A1 Extruder Pack Only', price: 349.0, stock: 15, sku: 'BML-A1-STANDALONE' },
        ],
      },
      images: {
        create: [
          { url: 'https://picsum.photos/seed/a1/800/800', isPrimary: true },
          { url: 'https://picsum.photos/seed/a1back/800/800', isPrimary: false },
        ],
      },
    },
  });

  const crealityK1Max = await prisma.product.create({
    data: {
      name: 'Creality K1 Max CoreXY',
      slug: 'creality-k1-max',
      sku: 'CRL-K1MAX',
      description: 'Insanely fast 600mm/s CoreXY enclosure printer with huge 300x300x300mm build volumes.',
      mrp: 999.0,
      salePrice: 899.0,
      dealerPrice: 779.0,
      stock: 18,
      categoryId: crealityCat.id,
      brandId: crealityBrand.id,
      is360Supported: true,
      seoTitle: 'Creality K1 Max 600mm/s Enclosure 3D Printer',
      seoDescription: 'High performance AI-driven LiDAR CoreXY enclosed structure perfect for printing structural components.',
      seoKeywords: 'Creality, K1 Max, CoreXY, fast, Enclosure, LiDAR',
      variants: {
        create: [
          { name: 'K1 Max Standard edition', price: 899.0, stock: 18, sku: 'CRL-K1MAX-STD' },
        ],
      },
      images: {
        create: [
          { url: 'https://picsum.photos/seed/k1/800/800', isPrimary: true },
        ],
      },
    },
  });

  // 6. Theme settings seeding
  console.log('Seeding corporate brand identity settings...');
  await prisma.themeSettings.create({
    data: {
      id: 'global-settings',
      logo: 'https://picsum.photos/seed/brandlogo/250/60',
      favicon: 'https://picsum.photos/seed/brandfav/32/32',
      primaryColor: '#0f766e', // Elegant teal
      secondaryColor: '#dc2626', // Vibrant industrial red
      typography: 'Space Grotesk',
      headerConfig: {
        announceBar: '🌟 FREE DHL Shipping on wholesale materials container orders above $2500!',
        phoneSupport: '+1-800-3D-GALAX',
      },
      footerConfig: {
        copyright: '© 2026 Brahma Galaxy Labs Inc. Industrial additive fabrication systems. All Rights Reserved.',
        links: [
          { text: 'Privacy Terms', url: '/privacy' },
          { text: 'Terms of Sale', url: '/terms' },
        ],
      },
      homepageConfig: {
        columnsCount: 4,
        allowDarkToggle: true,
        showTestimonials: true,
      },
    },
  });

  // 7. Homepage Layout Customizer seeding
  console.log('Seeding homepage visual sections...');
  await prisma.homepageSection.createMany({
    data: [
      {
        name: 'Hero Campaigns Slider',
        type: 'HERO_CAROUSEL',
        sequence: 1,
        content: {
          slides: [
            {
              title: 'Additive Manufacturing, Revolutionized.',
              subtitle: 'Procure high performance CoreXY filaments and systems.',
              btnText: 'Explore System Hardware',
              btnUrl: '/catalog/products',
              background: 'https://picsum.photos/seed/heroslide1/1600/600',
            },
          ],
        },
      },
      {
        name: 'Enterprise Client Testimonials',
        type: 'TESTIMONIALS',
        sequence: 2,
        content: {
          reviews: [
            {
              author: 'Dr. Evelyn Carter',
              firm: 'Hyperion Robotics Lab',
              quote: 'Brahmas B2B catalog integration lets our engineering squad queue shipments of high durability PETG on fully preset schedules.',
            },
          ],
        },
      },
    ],
  });

  // 8. Navigation megamenu links seeding
  console.log('Seeding multi levels megamenu Links...');
  const hardwareMenuItem = await prisma.menuItem.create({
    data: { label: 'Hardware Depot', url: '/catalog/printers', sortOrder: 1 },
  });

  await prisma.menuItem.create({
    data: {
      label: 'Bambu Lab printers',
      parentId: hardwareMenuItem.id,
      categoryId: bambuCat.id,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      label: 'Creality CoreXY',
      parentId: hardwareMenuItem.id,
      categoryId: crealityCat.id,
      sortOrder: 2,
    },
  });

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding process collapsed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
