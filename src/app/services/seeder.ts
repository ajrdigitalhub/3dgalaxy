import { Injectable } from '@angular/core';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Category, Advertisement, BlogPost, Coupon, SocialPost } from './datastore';

@Injectable({
  providedIn: 'root'
})
export class SeederService {

  async seedAll() {
    console.log('Starting Seeding...');
    await this.seedCategories();
    await this.seedProducts();
    await this.seedAds();
    await this.seedBlogs();
    await this.seedCoupons();
    await this.seedSocialPosts();
    console.log('Seeding Complete!');
  }

  private async seedCategories() {
    const cats: Category[] = [
      { id: '3d-printers', name: '3D Printers', slug: '3d-printers', parent_id: null, display_order: 1, description: 'Industrial and desktop 3D manufacturing units' },
      { id: 'materials', name: 'Materials', slug: 'materials', parent_id: null, display_order: 2, description: 'High-grade thermoplastic materials and resins' },
      { id: '3d-pens', name: '3D Pens', slug: '3d-pens', parent_id: null, display_order: 3, description: 'Creative 3D drawing pens and accessories' },
      { id: '3d-scanners', name: '3D Scanners', slug: '3d-scanners', parent_id: null, display_order: 4, description: 'High-precision 3D digitizing hardware' },
      { id: 'laser-engravers', name: 'Laser Engravers', slug: 'laser-engravers', parent_id: null, display_order: 5, description: 'Laser cutters and engraving modules' },
      { id: 'stem-kits', name: 'STEM Kits', slug: 'stem-kits', parent_id: null, display_order: 6, description: 'Educational robot building and science kits' },
      { id: 'spare-parts', name: 'Spare Parts', slug: 'spare-parts', parent_id: null, display_order: 7, description: 'Nozzles, belts, motherboards, hotends and more' },
      { id: 'brahma-3d-farm', name: 'Brahma 3D Farm', slug: 'brahma-3d-farm', parent_id: null, display_order: 8, description: 'High volume B2B batch print farming' },
      
      // Subcategories
      { id: 'fdm', name: 'FDM', slug: 'fdm', parent_id: '3d-printers', display_order: 1 },
      { id: 'fdm-multicolor', name: 'FDM Multicolor', slug: 'fdm-multicolor', parent_id: '3d-printers', display_order: 2 },
      { id: 'resin-printers', name: 'Resin', slug: 'resin-printers', parent_id: '3d-printers', display_order: 3 },
      { id: 'diy', name: 'DIY', slug: 'diy', parent_id: '3d-printers', display_order: 4 },
      { id: 'semi-assembled', name: 'Semi Assembled', slug: 'semi-assembled', parent_id: '3d-printers', display_order: 5 },
      { id: 'assembled', name: 'Assembled', slug: 'assembled', parent_id: '3d-printers', display_order: 6 }
    ];

    for (const cat of cats) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }
  }

  private async seedProducts() {
    const products: Omit<Product, 'id'>[] = [
      {
        name: 'Bambu Lab A1 Mini',
        slug: 'bambu-lab-a1-mini',
        sku: 'BL-A1-MINI',
        barcode: '789234123441',
        category_id: '3d-printers',
        subcategory_id: 'fdm',
        brand: 'Bambu Lab',
        description: 'Open-frame desktop cantilever 3D printer with high speed and auto-calibration.',
        long_description: 'Experience seamless printing with the Bambu Lab A1 Mini. Features full auto-calibration, active flow compensation, and plug-and-play setup. Perfect for creators, designers, and hobbyists looking for reliable single-material prints.',
        mrp: 25000,
        sale_price: 21499,
        dealer_price: 19500,
        stock: 15,
        reserved: 0,
        images: ['/images/products/bambu_a1_mini.png'],
        specs: [
          { label: 'Build Volume', value: '180x180x180mm' },
          { label: 'Max Speed', value: '500mm/s' },
          { label: 'Calibration', value: 'Full Auto' }
        ],
        reviews: [
          { id: 'r1', userName: 'Amit Kumar', rating: 5, comment: 'Super easy to set up. Literally printed out of the box!', date: '2026-05-10', verified: true },
          { id: 'r2', userName: 'Divya S.', rating: 4.6, comment: 'Great print quality, very compact for my desk.', date: '2026-05-20', verified: true }
        ],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['fdm', 'desktop', 'bambu-lab', 'popular']
      },
      {
        name: 'Bambu Lab A1 Mini Combo 3D Printer with AMS Lite',
        slug: 'bambu-lab-a1-mini-combo',
        sku: 'BL-A1-MINI-COMBO',
        barcode: '789234123442',
        category_id: '3d-printers',
        subcategory_id: 'fdm-multicolor',
        brand: 'Bambu Lab',
        description: 'Multi-color desktop 3D printing system with AMS Lite.',
        long_description: 'The Bambu Lab A1 Mini Combo unlocks multi-color printing with the AMS Lite feeder system. Print up to 4 colors simultaneously with automatic filament cutting and spool detection. The ultimate high-detail, colorful prototyping machine.',
        mrp: 45000,
        sale_price: 38499,
        dealer_price: 35000,
        stock: 8,
        reserved: 0,
        images: ['/images/products/bambu_a1_mini_combo.png'],
        specs: [
          { label: 'Colors Supported', value: '4 Colors' },
          { label: 'Build Volume', value: '180x180x180mm' },
          { label: 'AMS Type', value: 'AMS Lite' }
        ],
        reviews: [
          { id: 'r3', userName: 'Rohan Sharma', rating: 5, comment: 'Unbelievable multicolor prints. Highly recommended combo pack.', date: '2026-05-15', verified: true }
        ],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['fdm', 'multicolor', 'bambu-lab', 'combo']
      },
      {
        name: 'Bambu Lab A1 Combo - With AMS',
        slug: 'bambu-lab-a1-combo',
        sku: 'BL-A1-COMBO',
        barcode: '789234123443',
        category_id: '3d-printers',
        subcategory_id: 'fdm-multicolor',
        brand: 'Bambu Lab',
        description: 'Full-sized open frame multicolor 3D printer with AMS Lite.',
        long_description: 'Experience seamless multi-color 3D printing with the Bambu Lab A1. Featuring full auto calibration and active flow rate compensation. With a spacious 256*256*256 mm³ build volume and compatibility with various filaments.',
        mrp: 55000,
        sale_price: 48999,
        dealer_price: 44500,
        stock: 10,
        reserved: 0,
        images: ['/images/products/bambu_a1_combo.png'],
        specs: [
          { label: 'Build Volume', value: '256x256x256mm' },
          { label: 'AMS Spools', value: '4 Colors' },
          { label: 'Max Bed Temp', value: '100°C' }
        ],
        reviews: [
          { id: 'r4', userName: 'Sanjay Rawat', rating: 4.8, comment: 'Active flow rate compensation works brilliantly.', date: '2026-05-18', verified: true }
        ],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['fdm', 'multicolor', 'bambu-lab', 'large']
      },
      {
        name: 'Bambu Lab P1S 3D Printer',
        slug: 'bambu-lab-p1s',
        sku: 'BL-P1S',
        barcode: '789234123444',
        category_id: '3d-printers',
        subcategory_id: 'fdm',
        brand: 'Bambu Lab',
        description: 'Fully enclosed CoreXY desktop 3D printer for high performance.',
        long_description: 'Bambu Lab P1S features a fully enclosed design with advanced cooling fans and carbon filter. Great for printing advanced filaments like ABS, ASA, and PETG with exceptional reliability and speed.',
        mrp: 60000,
        sale_price: 52499,
        dealer_price: 48000,
        stock: 6,
        reserved: 0,
        images: ['/images/products/bambu_p1s.png'],
        specs: [
          { label: 'Build Volume', value: '256x256x256mm' },
          { label: 'Enclosure', value: 'Fully Enclosed' },
          { label: 'Acceleration', value: '20000 mm/s²' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: true,
        tags: ['fdm', 'enclosed', 'corexy', 'bambu-lab']
      },
      {
        name: 'Bambu Lab P1S Combo 3D Printer',
        slug: 'bambu-lab-p1s-combo',
        sku: 'BL-P1S-COMBO',
        barcode: '789234123445',
        category_id: '3d-printers',
        subcategory_id: 'fdm-multicolor',
        brand: 'Bambu Lab',
        description: 'Fully enclosed CoreXY printer with top-mounted AMS system.',
        long_description: 'The Bambu Lab P1S Combo brings multi-color printing to a premium enclosed machine. Supports up to 16 colors (using 4 daisy-chained AMS units), enclosed printing environment, and carbon filter air filtration.',
        mrp: 78000,
        sale_price: 69999,
        dealer_price: 64000,
        stock: 4,
        reserved: 0,
        images: ['/images/products/bambu_p1s.png'],
        specs: [
          { label: 'AMS Type', value: 'Standard AMS (Enclosed)' },
          { label: 'Build Volume', value: '256x256x256mm' },
          { label: 'Filament Hub', value: '4-Color Included' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: true,
        tags: ['fdm', 'enclosed', 'multicolor', 'bambu-lab']
      },
      {
        name: 'Creality Sparx i7 Combo',
        slug: 'creality-sparx-i7-combo',
        sku: 'CR-SPX-I7',
        barcode: '697163654551',
        category_id: '3d-printers',
        subcategory_id: 'assembled',
        brand: 'Creality',
        description: 'Professional grade dual extrusion enclosed CoreXY 3D printer.',
        long_description: 'The Creality Sparx i7 Combo brings professional grade 3D printing to your workshop with its dual extrusion capability and heated build platform. Engineered for precision and speed, this FDM printer handles complex multi-material projects with ease, delivering consistent layer adhesion and dimensional accuracy. With its intuitive touchscreen interface and reliable performance, the Sparx i7 Combo is ideal for makers, engineers, and hobbyists seeking versatility without compromising on quality.',
        mrp: 55000,
        sale_price: 48999,
        dealer_price: 44000,
        stock: 3,
        reserved: 0,
        images: ['/images/products/creality_k1_max.png'],
        specs: [
          { label: 'Technology', value: 'Enclosed CoreXY' },
          { label: 'Dual Extrusion', value: 'Yes' },
          { label: 'Heated Bed', value: 'Up to 110°C' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: true,
        tags: ['fdm', 'enclosed', 'creality', 'dual-extrusion']
      },
      {
        name: 'Anycubic Kobra 3 Max Combo FDM 3D Printer',
        slug: 'anycubic-kobra-3-max',
        sku: 'AC-KB3-MAX',
        barcode: '543210987991',
        category_id: '3d-printers',
        subcategory_id: 'semi-assembled',
        brand: 'Anycubic',
        description: 'Large scale budget FDM printer with high detail multi-color.',
        long_description: 'Anycubic Kobra 3 Max Combo FDM 3D Printer stands out as one of the best budget 3D printers, offering high-quality multi-colour 3D printing capabilities at a low cost. Features active humidity-controlled dry box for filament.',
        mrp: 50000,
        sale_price: 44999,
        dealer_price: 40000,
        stock: 5,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1631035626723-cd8e9ef9e728?auto=format&fit=crop&q=80&w=800'],
        specs: [
          { label: 'Build Volume', value: '420x420x500mm' },
          { label: 'Multi-Color', value: 'Anycubic Color Engine Pro' },
          { label: 'Max Speed', value: '600mm/s' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['fdm', 'multicolor', 'anycubic', 'large-bed']
      },
      {
        name: 'ELEGOO Neptune 4 Max',
        slug: 'elegoo-neptune-4-max',
        sku: 'EL-NP4-MAX',
        barcode: '543210987992',
        category_id: '3d-printers',
        subcategory_id: 'diy',
        brand: 'Elegoo',
        description: 'Massive build volume FDM printer with Klipper pre-installed.',
        long_description: 'The Neptune 4 Max features Klipper firmware for high speed printing, a huge 420x420x480mm build bed, dual-gear direct extruder, and intelligent dual-band print bed heating.',
        mrp: 45050,
        sale_price: 39999,
        dealer_price: 36000,
        stock: 7,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800'],
        specs: [
          { label: 'Firmware', value: 'Klipper' },
          { label: 'Build Volume', value: '420x420x480mm' },
          { label: 'Max Speed', value: '500mm/s' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['fdm', 'elegoo', 'klipper', 'large-bed']
      },
      {
        name: 'Anycubic Kobra 2 Combo',
        slug: 'anycubic-kobra-2-combo',
        sku: 'AC-KB2-COMBO',
        barcode: '543210987993',
        category_id: '3d-printers',
        subcategory_id: 'semi-assembled',
        brand: 'Anycubic',
        description: 'High speed Cartesian FDM printer with LeviQ 2.0 auto leveling.',
        long_description: 'With a printing speed of up to 300mm/s, the Anycubic Kobra 2 offers high performance at an entry-level price. Features direct drive extruder and precise LeviQ 2.0 bed leveling system.',
        mrp: 49999,
        sale_price: 44999,
        dealer_price: 41000,
        stock: 12,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800'],
        specs: [
          { label: 'Max Speed', value: '300mm/s' },
          { label: 'Levelling', value: 'LeviQ 2.0 Auto' },
          { label: 'Bed', value: 'PEI Spring Steel' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['fdm', 'anycubic', 'budget']
      },
      {
        name: 'PLA Pro Filament 1.75mm Green',
        slug: 'pla-pro-green',
        sku: '3DG-PLA-GRN',
        barcode: '111222333451',
        category_id: 'materials',
        brand: '3D Galaxy',
        description: 'Tangle-free, premium grade green PLA filament.',
        mrp: 1200,
        sale_price: 950,
        dealer_price: 700,
        stock: 120,
        reserved: 0,
        images: ['/images/products/pla_filament_white.png'],
        specs: [
          { label: 'Diameter', value: '1.75mm' },
          { label: 'Tolerance', value: '±0.02mm' },
          { label: 'Temp', value: '190-220°C' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'green']
      },
      {
        name: 'PLA Pro Filament 1.75mm Bundle Pack',
        slug: 'pla-pro-bundle',
        sku: '3DG-PLA-BUNDLE',
        barcode: '111222333452',
        category_id: 'materials',
        brand: '3D Galaxy',
        description: 'Multipack of high precision PLA Pro filaments (3x 1kg spools).',
        mrp: 1500,
        sale_price: 1180,
        dealer_price: 900,
        stock: 45,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1608962714006-256ac61c77d5?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Quantity', value: '3 Spools x 1kg' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'bundle']
      },
      {
        name: 'PLA Silk Color Filament',
        slug: 'pla-silk-color',
        sku: '3DG-PLA-SILK',
        barcode: '111222333453',
        category_id: 'materials',
        brand: '3D Galaxy',
        description: 'High sheen silk finish PLA filament for decorative prints.',
        mrp: 1100,
        sale_price: 820,
        dealer_price: 600,
        stock: 90,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1573868026225-c8434301a403?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Finish', value: 'Glossy Silk' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'silk']
      },
      {
        name: 'PLA Pro Filament 1kg Spool',
        slug: 'pla-pro-sunlu-1kg',
        sku: 'SL-PLA-PRO-1K',
        barcode: '111222333454',
        category_id: 'materials',
        brand: 'Sunlu',
        description: 'High strength, neat winding PLA filament by Sunlu.',
        mrp: 1600,
        sale_price: 1299,
        dealer_price: 1000,
        stock: 140,
        reserved: 0,
        images: ['/images/products/pla_filament_white.png'],
        specs: [
          { label: 'Winding', value: 'Neat / Auto' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['filament', 'pla', 'sunlu']
      },
      {
        name: 'Silk PLA Rainbow Filament',
        slug: 'silk-pla-rainbow',
        sku: 'SL-PLA-RAINBOW',
        barcode: '111222333455',
        category_id: 'materials',
        brand: 'Sunlu',
        description: 'Gorgeous multi-color transition silk PLA filament.',
        mrp: 2000,
        sale_price: 1599,
        dealer_price: 1200,
        stock: 65,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1608962714006-256ac61c77d5?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Color Transition', value: 'Every 5 meters' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['filament', 'pla', 'rainbow', 'silk']
      },
      {
        name: 'PLA Pro Single Colour Bundle Pack',
        slug: 'pla-pro-bulk-single',
        sku: 'SL-PLA-BULK-SINGLE',
        barcode: '111222333456',
        category_id: 'materials',
        brand: 'Sunlu',
        description: 'Bulk carton of 10x 1kg spools of a single PLA color.',
        mrp: 10000,
        sale_price: 8200,
        dealer_price: 7000,
        stock: 15,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1573868026225-c8434301a403?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Weight', value: '10 kg Total' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['filament', 'pla', 'bulk']
      },
      {
        name: '0.4 mm Nozzle for 3D Printer Nozzle Cleaning',
        slug: 'nozzle-04-cleaning',
        sku: 'CR-NZL-04',
        barcode: '444555666001',
        category_id: 'spare-parts',
        brand: 'Creality',
        description: 'Brass M6 thread 0.4mm extruder nozzle + cleaning kit.',
        mrp: 50,
        sale_price: 26,
        dealer_price: 15,
        stock: 350,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Aperture', value: '0.4mm' },
          { label: 'Material', value: 'Brass' },
          { label: 'Thread', value: 'M6' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-part', 'nozzle', 'brass']
      },
      {
        name: 'Hotend Kit for Bambu Lab X1 and P1P',
        slug: 'bambu-hotend-kit',
        sku: 'BL-HTND-KIT',
        barcode: '444555666002',
        category_id: 'spare-parts',
        brand: 'Bambu Lab',
        description: 'Replacement hotend assembly with ceramic heating block.',
        mrp: 1800,
        sale_price: 1399,
        dealer_price: 1100,
        stock: 25,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Temp Range', value: 'Up to 300°C' },
          { label: 'Nozzle Type', value: 'Hardened Steel' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-part', 'hotend', 'bambu-lab']
      },
      {
        name: 'Bambu Lab Harden Steel Nozzle for A1 Mini',
        slug: 'bambu-nozzle-a1-mini',
        sku: 'BL-NZL-A1M',
        barcode: '444555666003',
        category_id: 'spare-parts',
        brand: 'Bambu Lab',
        description: 'Hardened steel quick-change nozzle for Bambu Lab A1 Mini.',
        mrp: 800,
        sale_price: 549,
        dealer_price: 400,
        stock: 50,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Diameter', value: '0.4mm' },
          { label: 'Material', value: 'Hardened Steel' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['spare-part', 'nozzle', 'bambu-lab']
      },
      {
        name: 'Neon Lamp 16 Color Led module',
        slug: 'neon-lamp-16-color',
        sku: '3DG-NEON-16C',
        barcode: '444555666004',
        category_id: 'spare-parts',
        brand: '3D Galaxy',
        description: 'Acrylic 16-color LED light module with touch and remote controls.',
        mrp: 800,
        sale_price: 500,
        dealer_price: 350,
        stock: 75,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'LED Colors', value: '16 Colors' },
          { label: 'Interface', value: 'Touch & Remote' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-part', 'neon-lamp', 'led']
      },
      {
        name: 'Neon Lamp 7 Color Led module',
        slug: 'neon-lamp-7-color',
        sku: '3DG-NEON-7C',
        barcode: '444555666005',
        category_id: 'spare-parts',
        brand: '3D Galaxy',
        description: 'Desk LED neon light module with 7-color touch base.',
        mrp: 500,
        sale_price: 250,
        dealer_price: 180,
        stock: 120,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Colors', value: '7 Colors' },
          { label: 'Interface', value: 'Touch Base' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['spare-part', 'neon-lamp', 'led']
      },
      {
        name: 'Filament Cutter',
        slug: '3dg-filament-cutter',
        sku: '3DG-CUTTER',
        barcode: '444555666006',
        category_id: 'spare-parts',
        brand: '3D Galaxy',
        description: 'Micro cutter plier for trimming filament strands clean.',
        mrp: 300,
        sale_price: 169,
        dealer_price: 100,
        stock: 250,
        reserved: 0,
        images: ['https://images.unsplash.com/photo-1530124560072-aae81f84a0dd?auto=format&fit=crop&q=80&w=300'],
        specs: [
          { label: 'Type', value: 'Micro Cutter Plier' },
          { label: 'Application', value: 'Filament Trimming' }
        ],
        reviews: [],
        qnas: [],
        featured: false,
        is360Supported: false,
        tags: ['spare-part', 'tool', 'cutter']
      }
    ];

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const id = `prod-${i + 1}`;
        await setDoc(doc(db, 'products', id), { ...p, id });
    }
  }

  private async seedAds() {
    const ads: Advertisement[] = [
      {
        id: 'ad-top',
        title: 'GRAND OPENING SPECIAL: USE CODE "GALAXY10" TO GET 10% OFF ON ORDERS ABOVE ₹5,000!',
        imageUrl: '/images/hero_galaxy_ecosystem.png',
        targetUrl: '/products',
        position: 'top-banner',
        impressions: 0,
        clicks: 0,
        status: 'active',
        revenuePerClick: 5
      },
      {
        id: 'ad-footer',
        title: 'Need High-Precision Custom Prints? Upload your 3D Models in our Volumetric Estimator!',
        imageUrl: '/images/hero_precision_metrology.png',
        targetUrl: '/slicer',
        position: 'footer',
        impressions: 0,
        clicks: 0,
        status: 'active',
        revenuePerClick: 8
      }
    ];

    for (const ad of ads) {
      await setDoc(doc(db, 'advertisements', ad.id), ad);
    }
  }

  private async seedBlogs() {
    const blogs: BlogPost[] = [
      {
        id: 'blog-1',
        title: 'Mastering Multi-Color 3D Printing',
        slug: 'mastering-multi-color-3d-printing',
        excerpt: 'Learn how to configure your slicer and filament systems to create stunning multi-color objects with ease.',
        content: 'Multi-color 3D printing has revolutionized prototyping and modeling. With systems like the Bambu Lab AMS, makers can now easily create prints with up to 16 colors. However, setting up these prints requires careful consideration of purge volumes, prime towers, and color layering to avoid bleeding and structural failure. This guide walks you through the essential parameters in Bambu Studio and OrcaSlicer.',
        imageUrl: '/images/hero_academy_mastery.png',
        author: 'Galaxy Lab Staff',
        date: new Date().toISOString().split('T')[0],
        tags: ['guide', 'bambu-lab', 'multi-color']
      },
      {
        id: 'blog-2',
        title: 'The Resin SLA Safety Protocols You Must Know',
        slug: 'resin-safety-protocols',
        excerpt: 'Working with photopolymer resins requires specific PPE and curing procedures. Read our complete guide.',
        content: 'SLA resin printers offer incredible surface finish and detail, but the liquid photopolymer resins are toxic and require careful handling. Always wear nitrile gloves, safety goggles, and work in a well-ventilated space. Remember to properly wash prints in Isopropyl Alcohol (IPA) and fully cure them under UV light before handling. Dispose of liquid resin waste responsibly by curing it under the sun.',
        imageUrl: '/images/products/elegoo_mars_4.png',
        author: 'Dr. Ramesh Kumar',
        date: new Date().toISOString().split('T')[0],
        tags: ['resin', 'safety', 'tutorial']
      },
      {
        id: 'blog-3',
        title: 'FDM vs SLA: Which Technology to Choose?',
        slug: 'fdm-vs-sla-technology-guide',
        excerpt: 'We break down the tolerances, material properties, and cost structures of both major printing techs.',
        content: 'FDM (Fused Deposition Modeling) and SLA (Stereolithography) are the two most popular desktop 3D printing technologies. FDM uses thermoplastic spools and is great for structural parts, functional prototypes, and large models. SLA uses liquid resin cured by UV light, delivering micro-scale accuracy and ultra-smooth surfaces, making it ideal for jewelry, dental guides, and highly detailed miniatures. Choose FDM for utility and SLA for detail.',
        imageUrl: '/images/hero_precision_metrology.png',
        author: 'Sumit Sharma',
        date: new Date().toISOString().split('T')[0],
        tags: ['comparison', 'fdm', 'sla']
      }
    ];

    for (const blog of blogs) {
      await setDoc(doc(db, 'blogPosts', blog.id), blog);
    }
  }

  private async seedCoupons() {
    const coupons: Coupon[] = [
      { code: 'GALAXY10', discountPercent: 10, minSpent: 5000 },
      { code: 'WELCOME20', discountPercent: 20, minSpent: 1000 },
      { code: 'MAKER50', discountPercent: 50, minSpent: 20000 }
    ];

    for (const c of coupons) {
      await setDoc(doc(db, 'coupons', c.code), c);
    }
  }

  private async seedSocialPosts() {
    const posts: SocialPost[] = [
      {
        id: 'post-1',
        username: 'maker_ramesh',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        imageUrl: '/images/products/creality_k1_max.png',
        caption: 'Look at the speed of Creality K1 Max! This benchy completed in just 15 minutes with flawless layers! #3dprinting #speed',
        likes: 124,
        approved: true,
        date: new Date().toISOString().split('T')[0],
        products_tagged: ['prod-6']
      },
      {
        id: 'post-2',
        username: 'design_by_priya',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        imageUrl: '/images/products/bambu_a1_combo.png',
        caption: 'Multi-color carbon-fiber prints fresh off the Bambu Lab A1 Combo. Absolutely stunning mechanical fit.',
        likes: 256,
        approved: true,
        date: new Date().toISOString().split('T')[0],
        products_tagged: ['prod-3']
      }
    ];

    for (const post of posts) {
      await setDoc(doc(db, 'socialPosts', post.id), post);
    }
  }

  async clearAll() {
      const pSnap = await getDocs(collection(db, 'products'));
      for (const d of pSnap.docs) await deleteDoc(d.ref);

      const cSnap = await getDocs(collection(db, 'categories'));
      for (const d of cSnap.docs) await deleteDoc(d.ref);

      const aSnap = await getDocs(collection(db, 'advertisements'));
      for (const d of aSnap.docs) await deleteDoc(d.ref);

      const bSnap = await getDocs(collection(db, 'blogPosts'));
      for (const d of bSnap.docs) await deleteDoc(d.ref);

      const coSnap = await getDocs(collection(db, 'coupons'));
      for (const d of coSnap.docs) await deleteDoc(d.ref);

      const sSnap = await getDocs(collection(db, 'socialPosts'));
      for (const d of sSnap.docs) await deleteDoc(d.ref);
  }
}
