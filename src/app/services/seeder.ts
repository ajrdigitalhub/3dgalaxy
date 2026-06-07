import { Injectable } from '@angular/core';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from './datastore';

@Injectable({
  providedIn: 'root'
})
export class SeederService {

  async seedAll() {
    console.log('Starting Seeding with high-fidelity products...');
    await this.seedCategories();
    await this.seedProducts();
    console.log('Seeding Complete!');
  }

  private async seedCategories() {
    const cats: any[] = [
      // 1. Root categories
      { id: '3d-printers', name: '3D Printers', slug: '3d-printers', parent_id: null, parentId: null, display_order: 1, sortOrder: 1, description: 'Industrial and desktop 3D manufacturing units', isActive: true, isFeatured: true, seoTitle: 'Industrial and Desktop 3D Printers', seoDescription: 'Shop quality 3D printers, FDM, and Resin systems.' },
      { id: 'materials', name: 'Materials', slug: 'materials', parent_id: null, parentId: null, display_order: 2, sortOrder: 2, description: 'High-grade thermoplastic filaments and materials', isActive: true, isFeatured: true, seoTitle: 'Premium 3D Printing Materials', seoDescription: 'Thermostable PLA, ABS, and Resin formulations.' },
      { id: '3d-pens', name: '3D Pens', slug: '3d-pens', parent_id: null, parentId: null, display_order: 3, sortOrder: 3, description: 'Creativity 3D extrusion drawing pens', isActive: true, isFeatured: false },
      { id: '3d-scanners', name: '3D Scanners', slug: '3d-scanners', parent_id: null, parentId: null, display_order: 4, sortOrder: 4, description: 'High-precision 3D digitizing hardware', isActive: true, isFeatured: false },
      { id: 'laser-engravers', name: 'Laser Engravers', slug: 'laser-engravers', parent_id: null, parentId: null, display_order: 5, sortOrder: 5, description: 'High-power engraving and cutting units', isActive: true, isFeatured: false },
      { id: 'stem-kits', name: 'STEM Kits', slug: 'stem-kits', parent_id: null, parentId: null, display_order: 6, sortOrder: 6, description: 'Educational scientific and robotic frameworks', isActive: true, isFeatured: false },
      { id: 'spare-parts', name: 'Spare Parts', slug: 'spare-parts', parent_id: null, parentId: null, display_order: 7, sortOrder: 7, description: 'Nozzles, extruders, motors, and hardware', isActive: true, isFeatured: true },

      // 2. Subcategories of 3d-printers
      { id: 'fdm-printers', name: 'FDM Printers', slug: 'fdm-printers', parent_id: '3d-printers', parentId: '3d-printers', display_order: 1, sortOrder: 1, description: 'Fused Deposition Modeling printers', isActive: true, isFeatured: true },
      { id: 'resin-printers', name: 'Resin Printers', slug: 'resin-printers', parent_id: '3d-printers', parentId: '3d-printers', display_order: 2, sortOrder: 2, description: 'Ultra-resolution liquid photopolymer resin printers', isActive: true, isFeatured: true },
      { id: 'industrial-printers', name: 'Industrial Printers', slug: 'industrial-printers', parent_id: '3d-printers', parentId: '3d-printers', display_order: 3, sortOrder: 3, description: 'Turnkey enterprise scale engineering platforms', isActive: true, isFeatured: false },

      // 3. Subcategories of fdm-printers (Level 3)
      { id: 'bambu-lab', name: 'Bambu Lab', slug: 'bambu-lab', parent_id: 'fdm-printers', parentId: 'fdm-printers', display_order: 1, sortOrder: 1, description: 'Bambu Lab High Seed printers', isActive: true, isFeatured: true },
      { id: 'creality-fdm', name: 'Creality', slug: 'creality', parent_id: 'fdm-printers', parentId: 'fdm-printers', display_order: 2, sortOrder: 2, description: 'Creality Ender & K1 series', isActive: true, isFeatured: true },
      { id: 'flashforge-fdm', name: 'Flashforge', slug: 'flashforge', parent_id: 'fdm-printers', parentId: 'fdm-printers', display_order: 3, sortOrder: 3, description: 'Flashforge enclosed systems', isActive: true, isFeatured: false },

      // 4. Level 4 Subcategories of bambu-lab (making it unlimited depth!)
      { id: 'a1-series', name: 'A1 Series', slug: 'a1-series', parent_id: 'bambu-lab', parentId: 'bambu-lab', display_order: 1, sortOrder: 1, description: 'Bambu Lab Bed Slinger printers', isActive: true, isFeatured: true },
      { id: 'p1s-series', name: 'P1S Series', slug: 'p1s-series', parent_id: 'bambu-lab', parentId: 'bambu-lab', display_order: 2, sortOrder: 2, description: 'Bambu Lab CoreXY P1S setups', isActive: true, isFeatured: true },

      // 5. Subcategories of resin-printers (Level 3)
      { id: 'elegoo', name: 'Elegoo', slug: 'elegoo', parent_id: 'resin-printers', parentId: 'resin-printers', display_order: 1, sortOrder: 1, description: 'Elegoo Mars & Saturn series', isActive: true, isFeatured: true },
      { id: 'uniformation', name: 'Uniformation', slug: 'uniformation', parent_id: 'resin-printers', parentId: 'resin-printers', display_order: 2, sortOrder: 2, description: 'Uniformation GK series resin systems', isActive: true, isFeatured: false },

      // 6. Subcategories of Materials
      { id: 'filaments', name: 'Filaments', slug: 'filaments', parent_id: 'materials', parentId: 'materials', display_order: 1, sortOrder: 1, description: 'Plastic extrusion filaments', isActive: true, isFeatured: true },
      { id: 'resin-material', name: 'Resin Material', slug: 'resin-material', parent_id: 'materials', parentId: 'materials', display_order: 2, sortOrder: 2, description: 'SLA standard liquid resins', isActive: true, isFeatured: false },

      // 7. Subcategories of Filaments (Level 3)
      { id: 'pla', name: 'PLA', slug: 'pla', parent_id: 'filaments', parentId: 'filaments', display_order: 1, sortOrder: 1, description: 'Polylactic Acid biofilaments', isActive: true, isFeatured: true },
      { id: 'abs', name: 'ABS', slug: 'abs', parent_id: 'filaments', parentId: 'filaments', display_order: 2, sortOrder: 2, description: 'Acrylonitrile Butadiene Styrene robust spool', isActive: true, isFeatured: true },
      { id: 'petg', name: 'PETG', slug: 'petg', parent_id: 'filaments', parentId: 'filaments', display_order: 3, sortOrder: 3, description: 'Polyethylene Terephthalate Glycol spool', isActive: true, isFeatured: true },
      { id: 'tpu', name: 'TPU', slug: 'tpu', parent_id: 'filaments', parentId: 'filaments', display_order: 4, sortOrder: 4, description: 'Flexible Polyurethane filaments', isActive: true, isFeatured: false }
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
        barcode: '100000000001',
        category_id: '3d-printers',
        subcategory_id: 'a1-series',
        brand: 'Bambu Lab',
        description: 'High-speed desktop 3D printer with active flow compensation, active motor noise cancellation, and auto Bed leveling.',
        long_description: 'Pure performance in a mini form factor. Plug and play out of the box. True 500mm/s maximum speed combined with linear rails and active control systems makes A1 Mini the ultimate desktop printer.',
        mrp: 25000,
        sale_price: 21499,
        dealer_price: 19500,
        stock: 15,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/A1-mini_600x600.png'],
        specs: [
          { label: 'Build Volume', value: '180x180x180mm' },
          { label: 'Max Speed', value: '500mm/s' },
          { label: 'Hotend', value: 'All-metal Quick Swap' },
          { label: 'Input Shaping', value: 'Active Resonance Compensation' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: true,
        tags: ['bambu-lab', 'fdm', 'high-speed', 'a1'],
        isExclusive: true,
        warningText: 'Dispatch will be done after 20th June',
        avgRating: 5.0,
        ratingCount: 2
      },
      {
        name: 'Bambu Lab A1 Mini Combo 3D Printer with AMS Lite',
        slug: 'bambu-lab-a1-mini-combo',
        sku: 'BL-A1-MINI-COMBO',
        barcode: '100000000002',
        category_id: '3d-printers',
        subcategory_id: 'a1-series',
        brand: 'Bambu Lab',
        description: 'Multi-color high-speed 3D printer bundle including AMS Lite system for automatic materials management.',
        long_description: 'With AMS Lite, enjoy seamless 4-color printing. Advanced mechanical calibration, real-time extrusion diagnostics, and premium build quality.',
        mrp: 45000,
        sale_price: 38499,
        dealer_price: 35000,
        stock: 10,
        reserved: 1,
        images: ['https://store.bambulab.com/cdn/shop/files/A1_Mini_Combo_600x600.png', 'https://store.bambulab.com/cdn/shop/files/A1-mini-AMS-lite-Combo-Front-75_800x800.png'],
        specs: [
          { label: 'Multi-Color support', value: 'Up to 4 colors (AMS Lite)' },
          { label: 'Build Volume', value: '180x180x180mm' },
          { label: 'Max Speed', value: '500mm/s' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['bambu-lab', 'multicolor', 'ams', 'a1'],
        isExclusive: true,
        avgRating: 5.0,
        ratingCount: 2
      },
      {
        name: 'Bambu Lab A1 Combo - With AMS',
        slug: 'bambu-lab-a1-combo',
        sku: 'BL-A1-COMBO',
        barcode: '100000000003',
        category_id: '3d-printers',
        subcategory_id: 'a1-series',
        brand: 'Bambu Lab',
        description: 'Full-size high speed FDM printer. Experience seamless multi color 3D printing with the Bambu Lab A1.',
        long_description: 'Featuring full auto-calibration, active flow rate compensation, and active motor noise cancellation. Spaciously robust build volume supporting all key thermoplastic filaments with spectacular precision.',
        mrp: 55000,
        sale_price: 48999,
        dealer_price: 44000,
        stock: 12,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'],
        specs: [
          { label: 'Build Volume', value: '256x256x256mm' },
          { label: 'Filament System', value: 'Seamless Multi-Color' },
          { label: 'Auto Calibration', value: 'Active Flow & Vib' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: true,
        tags: ['bambu-lab', 'multicolor', 'ams-lite', 'a1'],
        isExclusive: true,
        avgRating: 5.0,
        ratingCount: 6
      },
      {
        name: 'Bambu Lab P1S 3D Printer',
        slug: 'bambu-lab-p1s',
        sku: 'BL-P1S',
        barcode: '100000000004',
        category_id: '3d-printers',
        subcategory_id: 'p1s-series',
        brand: 'Bambu Lab',
        description: 'Fully enclosed CoreXY 3D printer for carbon fiber and professional high-temp printing.',
        long_description: 'The supreme intermediate printer. Completely enclosed metal structure with carbon filter ventilation. High-speed, robust acceleration, and unparalleled reliability.',
        mrp: 60000,
        sale_price: 52499,
        dealer_price: 48000,
        stock: 8,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/P1S_800x800.png'],
        specs: [
          { label: 'Chamber', value: 'Welded Full Enclosure' },
          { label: 'Build Volume', value: '256x256x256mm' },
          { label: 'Acceleration', value: '20000 mm/s²' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['bambu-lab', 'enclosed', 'corexy', 'p1s'],
        isExclusive: true,
        warningText: 'Dispatch will be done after 20th June',
        avgRating: 5.0,
        ratingCount: 1
      },
      {
        name: 'Bambu Lab P1S Combo 3D Printer',
        slug: 'bambu-lab-p1s-combo',
        sku: 'BL-P1S-COMBO',
        barcode: '100000000005',
        category_id: '3d-printers',
        subcategory_id: 'p1s-series',
        brand: 'Bambu Lab',
        description: 'Elite CoreXY enclosed multi-color system containing Bambu Lab AMS system for 16-color compatibility.',
        long_description: 'Ready to run in less than 15 minutes. Heavy duty multi-color management with airtight AMS moisture protection.',
        mrp: 78000,
        sale_price: 69999,
        dealer_price: 64000,
        stock: 6,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/P1S_Combo_800x800.png'],
        specs: [
          { label: 'Chamber', value: 'Fully Enclosed' },
          { label: 'Multi-Color', value: 'Dynamic 16-Color Support' },
          { label: 'Build Volume', value: '256x256x256mm' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: true,
        tags: ['bambu-lab', 'enclosed', 'ams', 'p1s'],
        isExclusive: true,
        avgRating: 5.0,
        ratingCount: 1
      },
      {
        name: 'Creality Sparx i7 Combo',
        slug: 'creality-sparx-i7',
        sku: 'CR-SPX-I7',
        barcode: '100000000006',
        category_id: '3d-printers',
        subcategory_id: 'creality-fdm',
        brand: 'Creality',
        description: 'Professional grade dual extrusion smart 3D printer with AI cameras, heated build platform, and high speed.',
        long_description: 'The Creality Sparx i7 Combo brings professional grade 3D printing to your workshop with dual extrusion capability. Complete with intuitive touchscreen interface, intelligent support material layers, and premium multi-material setups.',
        mrp: 54000,
        sale_price: 48999,
        dealer_price: 43000,
        stock: 5,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/X1C_Combo_800x800.png'],
        specs: [
          { label: 'Heated bed', value: 'Up to 110°C' },
          { label: 'Dual Extrusion', value: 'Supported' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['creality', 'dual-extrusion'],
        avgRating: 4.8,
        ratingCount: 3
      },
      {
        name: 'Anycubic Kobra 3 Max Combo FDM 3D Printer',
        slug: 'anycubic-kobra-3-max',
        sku: 'AC-K3-MAX',
        barcode: '100000000007',
        category_id: '3d-printers',
        subcategory_id: 'fdm-printers',
        brand: 'Anycubic',
        description: 'Anycubic Kobra 3 Max Combo stands out as one of the best budget multicolour 3D printers, offering high quality multi-color printing capabilities at low cost.',
        long_description: 'Equipped with smart material synchronization, larger than life build volume, and robust speed metrics. A stunning entry-point for makers looking to create multi-color models without premium financial commitments.',
        mrp: 49999,
        sale_price: 44999,
        dealer_price: 39000,
        stock: 7,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png'],
        specs: [
          { label: 'Build Area', value: '320x320x350mm' },
          { label: 'Sync Mechanism', value: 'Color-Engine 4-Ch' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['anycubic', 'multicolor', 'budget'],
        avgRating: 4.6,
        ratingCount: 5
      },
      // Filament Categories
      {
        name: 'PLA Pro Filament 1.75mm Green 1kg',
        slug: 'pla-pro-green',
        sku: '3DG-PLA-GRN-1',
        barcode: '200000000001',
        category_id: 'materials',
        subcategory_id: 'pla',
        brand: '3D Galaxy',
        description: 'Super high toughness, tangle-free, perfect winding green filament.',
        mrp: 1200,
        sale_price: 820,
        dealer_price: 700,
        stock: 120,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/products/PLA_Basic_Green_800x800.png'],
        specs: [
          { label: 'Winding', value: 'Seamless Precision' },
          { label: 'Diameter', value: '1.75mm' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'green'],
        avgRating: 5.0,
        ratingCount: 12
      },
      {
        name: 'PLA Pro Filament 1.75mm Grey 1kg',
        slug: 'pla-pro-grey',
        sku: '3DG-PLA-GRY-1',
        barcode: '200000000002',
        category_id: 'materials',
        subcategory_id: 'pla',
        brand: '3D Galaxy',
        description: 'Elite strength grey filament, perfect for mechanical parts and prototyping.',
        mrp: 1200,
        sale_price: 820,
        dealer_price: 700,
        stock: 150,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/products/PLA_Basic_Grey_800x800.png'],
        specs: [
          { label: 'Diameter', value: '1.75mm' },
          { label: 'Precision', value: '±0.02mm' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'grey'],
        avgRating: 4.9,
        ratingCount: 9
      },
      {
        name: 'PLA Pro Filament 1.75mm Red 1kg',
        slug: 'pla-pro-red',
        sku: '3DG-PLA-RED-1',
        barcode: '200000000003',
        category_id: 'materials',
        subcategory_id: 'pla',
        brand: '3D Galaxy',
        description: 'Vivid red high quality PLA filament, extremely reliable extrusion.',
        mrp: 1200,
        sale_price: 820,
        dealer_price: 700,
        stock: 90,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/products/PLA_Basic_Red_800x800.png'],
        specs: [
          { label: 'Diameter', value: '1.75mm' },
          { label: 'Colourseal', value: 'Saturated Gloss' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'red'],
        avgRating: 5.0,
        ratingCount: 4
      },
      {
        name: 'PLA Rainbow Filament 1kg spool',
        slug: 'pla-rainbow-1k',
        sku: '3DG-PLA-RAINBOW',
        barcode: '200000000004',
        category_id: 'materials',
        subcategory_id: 'pla',
        brand: '3D Galaxy',
        description: 'Fascinating multi-color gradual shifting transition rainbow filament.',
        mrp: 1600,
        sale_price: 1199,
        dealer_price: 990,
        stock: 80,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/products/PLA_Rainbow_800x800.png'],
        specs: [
          { label: 'Transition', value: 'Every 5 meters' },
          { label: 'Weight', value: '1.0 kg' }
        ],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['filament', 'pla', 'rainbow'],
        avgRating: 5.0,
        ratingCount: 15
      },
      // Spare Parts
      {
        name: '0.4 mm Nozzle for 3D Printer',
        slug: '0-4-nozzle-brass',
        sku: 'CR-NZ-0.4',
        barcode: '300000000001',
        category_id: 'spare-parts',
        brand: 'Creality',
        description: 'High-quality 0.4mm brass nozzle designed for 1.75mm filament.',
        mrp: 50,
        sale_price: 24,
        dealer_price: 15,
        stock: 1200,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/products/0.4_nozzle_800x800.png'],
        specs: [{ label: 'Material', value: 'Brass' }, { label: 'Aperture', value: '0.4 mm' }],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-parts', 'nozzle', 'brass'],
        avgRating: 4.5,
        ratingCount: 40
      },
      {
        name: 'Bimetal Heatbreak for Bambu Lab',
        slug: 'bimetal-heatbreak-bl',
        sku: 'BL-HB-BIMETAL',
        barcode: '300000000002',
        category_id: 'spare-parts',
        brand: 'Bambu Lab',
        description: 'Copper-alloy titanium bimetal heatbreak prevents heat creep.',
        mrp: 1500,
        sale_price: 1199,
        dealer_price: 1000,
        stock: 50,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/heatbreak_800x800.png'],
        specs: [{ label: 'Alloy', value: 'Copper & Titanium' }],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-parts', 'bimetal', 'heatbreak'],
        avgRating: 4.8,
        ratingCount: 20
      },
      {
        name: 'Hardened Steel Nozzle',
        slug: 'hardened-steel-nozzle-0.4',
        sku: 'BL-NZ-HARD',
        barcode: '300000000003',
        category_id: 'spare-parts',
        brand: 'Bambu Lab',
        description: 'Premium wear resistant hardened nozzle for abrasive filaments like carbon fiber.',
        mrp: 400,
        sale_price: 249,
        dealer_price: 210,
        stock: 80,
        reserved: 0,
        images: ['https://store.bambulab.com/cdn/shop/files/hardened_nozzle_800x800.png'],
        specs: [{ label: 'Hardness', value: 'Mohs 9' }],
        reviews: [],
        qnas: [],
        featured: true,
        is360Supported: false,
        tags: ['spare-parts', 'nozzle', 'hardened-steel'],
        avgRating: 4.9,
        ratingCount: 15
      }
    ];

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const id = `prod-${i + 1}`;
        await setDoc(doc(db, 'products', id), { ...p, id });
    }
  }

  async clearAll() {
      const pSnap = await getDocs(collection(db, 'products'));
      for (const d of pSnap.docs) await deleteDoc(d.ref);

      const cSnap = await getDocs(collection(db, 'categories'));
      for (const d of cSnap.docs) await deleteDoc(d.ref);
  }
}
