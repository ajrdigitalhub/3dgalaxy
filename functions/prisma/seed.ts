import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seeding scenario...');

  // 1. Roles seeding
  console.log('Creating Roles...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin', description: 'Unrestricted access' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Administrative access' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Store manager access' },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'Staff' },
    update: {},
    create: { name: 'Staff', description: 'Staff access' },
  });

  // 2. Super Admin User seeding
  console.log('Registering Super Admin profile info...');
  const hashedAdminPassword = await bcrypt.hash('12345678', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@3dgalaxy.com' },
    update: {},
    create: {
      email: 'admin@3dgalaxy.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: hashedAdminPassword,
      isActive: true,
      roles: {
        create: {
          roleId: superAdminRole.id
        }
      }
    },
  });

  // 3. Brands seeding
  console.log('Creating Brands...');
  const brands = [
    { name: 'Bambu Lab', slug: 'bambu-lab' },
    { name: 'Creality', slug: 'creality' },
    { name: 'Flashforge', slug: 'flashforge' },
    { name: 'Elegoo', slug: 'elegoo' },
    { name: 'Uniformation', slug: 'uniformation' },
    { name: 'Anycubic', slug: 'anycubic' },
    { name: 'Prusa', slug: 'prusa' }
  ];

  const brandEntities: Record<string, any> = {};
  for (const b of brands) {
    brandEntities[b.slug] = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { name: b.name, slug: b.slug },
    });
  }

  // 4. Unlimited parent-child Category tree hierarchy seeding
  console.log('Seeding Category hierarchy tree...');

  const rootPrinters = await prisma.category.upsert({
    where: { slug: '3d-printers' },
    update: {},
    create: { name: '3D Printers', slug: '3d-printers', sortOrder: 1 },
  });

  const rootMaterials = await prisma.category.upsert({
    where: { slug: 'materials' },
    update: {},
    create: { name: 'Materials', slug: 'materials', sortOrder: 2 },
  });

  const rootPens = await prisma.category.upsert({
    where: { slug: '3d-pens' },
    update: {},
    create: { name: '3D Pens', slug: '3d-pens', sortOrder: 3 },
  });

  const rootScanners = await prisma.category.upsert({
    where: { slug: '3d-scanners' },
    update: {},
    create: { name: '3D Scanners', slug: '3d-scanners', sortOrder: 4 },
  });

  const rootLasers = await prisma.category.upsert({
    where: { slug: 'laser-engravers' },
    update: {},
    create: { name: 'Laser Engravers', slug: 'laser-engravers', sortOrder: 5 },
  });

  const rootStem = await prisma.category.upsert({
    where: { slug: 'stem-kits' },
    update: {},
    create: { name: 'STEM Kits', slug: 'stem-kits', sortOrder: 6 },
  });

  const rootSpare = await prisma.category.upsert({
    where: { slug: 'spare-parts' },
    update: {},
    create: { name: 'Spare Parts', slug: 'spare-parts', sortOrder: 7 },
  });

  // Printer Subcategories
  const fdmPrinters = await prisma.category.upsert({
    where: { slug: 'fdm-printers' },
    update: {},
    create: { name: 'FDM Printers', slug: 'fdm-printers', parentId: rootPrinters.id },
  });

  const resinPrinters = await prisma.category.upsert({
    where: { slug: 'resin-printers' },
    update: {},
    create: { name: 'Resin Printers', slug: 'resin-printers', parentId: rootPrinters.id },
  });

  const industrialPrinters = await prisma.category.upsert({
    where: { slug: 'industrial-printers' },
    update: {},
    create: { name: 'Industrial Printers', slug: 'industrial-printers', parentId: rootPrinters.id },
  });

  // FDM Brands Categories
  const catBambuFdm = await prisma.category.upsert({
    where: { slug: 'bambu-lab-fdm' },
    update: {},
    create: { name: 'Bambu Lab', slug: 'bambu-lab-fdm', parentId: fdmPrinters.id },
  });

  const catCrealityFdm = await prisma.category.upsert({
    where: { slug: 'creality-fdm' },
    update: {},
    create: { name: 'Creality', slug: 'creality-fdm', parentId: fdmPrinters.id },
  });

  await prisma.category.upsert({
    where: { slug: 'flashforge-fdm' },
    update: {},
    create: { name: 'Flashforge', slug: 'flashforge-fdm', parentId: fdmPrinters.id },
  });

  // Resin Brands Categories
  const catElegooResin = await prisma.category.upsert({
    where: { slug: 'elegoo-resin' },
    update: {},
    create: { name: 'Elegoo', slug: 'elegoo-resin', parentId: resinPrinters.id },
  });

  await prisma.category.upsert({
    where: { slug: 'uniformation-resin' },
    update: {},
    create: { name: 'Uniformation', slug: 'uniformation-resin', parentId: resinPrinters.id },
  });

  // Bambu Lab Models
  await prisma.category.upsert({
    where: { slug: 'bambu-lab-a1' },
    update: {},
    create: { name: 'A1', slug: 'bambu-lab-a1', parentId: catBambuFdm.id },
  });

  await prisma.category.upsert({
    where: { slug: 'bambu-lab-a1-mini' },
    update: {},
    create: { name: 'A1 Mini', slug: 'bambu-lab-a1-mini', parentId: catBambuFdm.id },
  });

  await prisma.category.upsert({
    where: { slug: 'bambu-lab-p1s' },
    update: {},
    create: { name: 'P1S', slug: 'bambu-lab-p1s', parentId: catBambuFdm.id },
  });

  // Materials Subcategories
  const filaments = await prisma.category.upsert({
    where: { slug: 'filaments' },
    update: {},
    create: { name: 'Filaments', slug: 'filaments', parentId: rootMaterials.id },
  });

  await prisma.category.upsert({
    where: { slug: 'resin' },
    update: {},
    create: { name: 'Resin', slug: 'resin', parentId: rootMaterials.id },
  });

  // Filaments Types
  await prisma.category.upsert({ where: { slug: 'pla-filament' }, update: {}, create: { name: 'PLA', slug: 'pla-filament', parentId: filaments.id } });
  await prisma.category.upsert({ where: { slug: 'abs-filament' }, update: {}, create: { name: 'ABS', slug: 'abs-filament', parentId: filaments.id } });
  await prisma.category.upsert({ where: { slug: 'petg-filament' }, update: {}, create: { name: 'PETG', slug: 'petg-filament', parentId: filaments.id } });
  await prisma.category.upsert({ where: { slug: 'tpu-filament' }, update: {}, create: { name: 'TPU', slug: 'tpu-filament', parentId: filaments.id } });

  // 5. Products seeding
  console.log('Seeding Products...');

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' }, // Try to not use hardcoded UUID usually but Prisma doesn't have unique on warehouse name.
    update: {},
    create: { name: 'Main Distribution Center' }
  });

  const bamuA1Product = await prisma.product.upsert({
    where: { slug: 'bambu-lab-a1-combo' },
    update: {},
    create: {
      name: 'Bambu Lab A1 Color Combo',
      slug: 'bambu-lab-a1-combo',
      sku: 'BML-A1-AMS',
      description: 'Multi-color printing right out of the box with AMS Lite feeder systems.',
      basePrice: 499.0,
      salePrice: 499.0,
      dealerPrice: 429.0,
      categoryId: catBambuFdm.id,
      brandId: brandEntities['bambu-lab'].id,
      variants: {
        create: [
          { name: 'Standard A1 Combo', price: 499.0, sku: 'BML-A1-COMBO-STD' },
        ],
      },
      images: {
        create: [
          { url: 'https://picsum.photos/seed/a1/800/800', altText: 'Bambu Lab A1' },
          { url: 'https://picsum.photos/seed/a12/800/800', altText: 'A1 Side view' },
        ],
      },
      specifications: {
        create: [
          { name: 'Build Volume', value: '256x256x256 mm' },
          { name: 'Max Speed', value: '500mm/s' },
          { name: 'Colors', value: 'Up to 4 with AMS Lite' }
        ]
      },
      downloads: {
        create: [
          { title: 'User Manual (PDF)', fileUrl: '#', downloadType: 'manual' },
          { title: 'Datasheet', fileUrl: '#', downloadType: 'datasheet' }
        ]
      },
      features: {
        create: [
          { title: 'Active Flow Rate Compensation', description: 'Real-time extrusion measurement', icon: 'speed' },
          { title: 'Full Auto Calibration', description: 'Automatic bed leveling and Z-offset', icon: 'settings' }
        ]
      },
      faqs: {
        create: [
          { question: 'Does it support ABS?', answer: 'It is an open frame printer, ABS is not recommended without an enclosure.' }
        ]
      }
    },
  });

  // Create Inventory
  const bamuA1Variant = await prisma.productVariant.findUnique({ where: { sku: 'BML-A1-COMBO-STD' }});
  if (bamuA1Variant) {
    const existingInv = await prisma.inventory.findFirst({ where: { productId: bamuA1Product.id, variantId: bamuA1Variant.id, warehouseId: mainWarehouse.id }});
    if (!existingInv) {
      await prisma.inventory.create({
        data: {
          productId: bamuA1Product.id,
          variantId: bamuA1Variant.id,
          warehouseId: mainWarehouse.id,
          quantity: 40
        }
      });
    }
  }

  const bambuA1Mini = await prisma.product.upsert({
    where: { slug: 'bambu-lab-a1-mini' },
    update: {},
    create: {
      name: 'Bambu Lab A1 Mini Combo',
      slug: 'bambu-lab-a1-mini',
      sku: 'BML-A1-MINI',
      description: 'Compact 3D printer for beginners.',
      basePrice: 249.0,
      categoryId: catBambuFdm.id,
      brandId: brandEntities['bambu-lab'].id,
    }
  });

  const crealityEnderProduct = await prisma.product.upsert({
    where: { slug: 'creality-ender-3-v3' },
    update: {},
    create: {
      name: 'Creality Ender-3 V3',
      slug: 'creality-ender-3-v3',
      sku: 'CRL-ED3V3',
      description: 'CoreXZ for fast printing.',
      basePrice: 389.0,
      categoryId: catCrealityFdm.id,
      brandId: brandEntities['creality'].id,
    }
  });

  const elegooMarsProduct = await prisma.product.upsert({
    where: { slug: 'elegoo-mars-4' },
    update: {},
    create: {
      name: 'Elegoo Mars 4 9K',
      slug: 'elegoo-mars-4',
      sku: 'ELG-MARS4',
      description: 'Unmatched 9K resolution for detailed resin models.',
      basePrice: 300.0,
      salePrice: 259.0,
      categoryId: catElegooResin.id,
      brandId: brandEntities['elegoo'].id,
    }
  });

  // 6. Theme Settings seeding
  console.log('Seeding Theme Settings...');
  const defaultThemeSettings = {
    "global-settings": {
      logo: 'https://picsum.photos/seed/brandlogo/250/60',
      favicon: 'https://picsum.photos/seed/brandfav/32/32',
      primaryColor: '#0f766e',
      secondaryColor: '#dc2626',
      footerText: '© 2026 3D Galaxy Inc. Industrial additive fabrication systems. All Rights Reserved.',
      companyDetails: '123 Maker Street, Tech City, USA'
    }
  };

  for (const [key, value] of Object.entries(defaultThemeSettings)) {
    await prisma.themeSetting.upsert({
      where: { keyName: key },
      update: { value: JSON.stringify(value) },
      create: { keyName: key, value: JSON.stringify(value) },
    });
  }

  // 7. Homepage Sections seeding
  const existingSections = await prisma.homepageSection.count();
  if (existingSections === 0) {
    const homeHeroSection = await prisma.homepageSection.create({
      data: {
        name: 'Hero Banner',
        type: 'HERO',
        sortOrder: 1,
        items: {
          create: [
            {
              title: 'Additive Manufacturing, Revolutionized.',
              subTitle: 'Procure high performance CoreXY filaments and systems.',
              linkUrl: '/catalog/products',
              imageUrl: 'https://picsum.photos/seed/heroslide1/1600/600',
              sortOrder: 1
            }
          ]
        }
      }
    });

    await prisma.homepageSection.create({
      data: {
        name: 'Featured Products',
        type: 'FEATURED_PRODUCTS',
        sortOrder: 2,
      }
    });

    await prisma.homepageSection.create({
      data: {
        name: 'Best Sellers',
        type: 'BEST_SELLERS',
        sortOrder: 3,
      }
    });

    await prisma.homepageSection.create({
      data: {
        name: 'Categories',
        type: 'CATEGORIES',
        sortOrder: 4,
      }
    });

    await prisma.homepageSection.create({
      data: {
        name: 'Brands',
        type: 'BRANDS',
        sortOrder: 5,
      }
    });
  }

  // 8. Menu Builder seeding
  const existingMenus = await prisma.menu.count();
  if (existingMenus === 0) {
    const mainMenu = await prisma.menu.create({
      data: { name: 'Header Main Menu', location: 'HEADER' }
    });

    const printersMenu = await prisma.menuItem.create({
      data: { title: '3D Printers', url: '/category/3d-printers', sortOrder: 1, menuId: mainMenu.id }
    });
    
    await prisma.menuItem.createMany({
      data: [
        { title: 'FDM Printers', url: '/category/fdm-printers', sortOrder: 1, menuId: mainMenu.id, parentId: printersMenu.id },
        { title: 'Resin Printers', url: '/category/resin-printers', sortOrder: 2, menuId: mainMenu.id, parentId: printersMenu.id },
      ]
    });

    const materialsMenu = await prisma.menuItem.create({
      data: { title: 'Materials', url: '/category/materials', sortOrder: 2, menuId: mainMenu.id }
    });

    await prisma.menuItem.createMany({
      data: [
        { title: 'Filaments', url: '/category/filaments', sortOrder: 1, menuId: mainMenu.id, parentId: materialsMenu.id },
        { title: 'Resin', url: '/category/resin', sortOrder: 2, menuId: mainMenu.id, parentId: materialsMenu.id },
      ]
    });
  }

  // 9. Banners seeding
  const existingBanners = await prisma.banner.count();
  if (existingBanners === 0) {
    await prisma.banner.createMany({
      data: [
        { title: 'Homepage Main Banner', imageUrl: 'https://picsum.photos/seed/homebanner/1200/400', position: 'HOMEPAGE_TOP' },
        { title: 'Summer Promotion', imageUrl: 'https://picsum.photos/seed/promobanner/1200/300', position: 'PROMOTIONAL' },
        { title: 'FDM Category Highlights', imageUrl: 'https://picsum.photos/seed/catbanner/1200/200', position: 'CATEGORY_HEADER' }
      ]
    });
  }

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

