/**
 * 3D Galaxy Automated Regression Test Suite
 * Test Fixtures & Mock Datasets
 * DO NOT USE PRODUCTION CREDENTIALS OR MODIFY PROD DATA.
 */

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number;
  stock: number;
  codAvailable: boolean;
  weightInGrams: number;
  categoryIds: string[];
  isActive: boolean;
  variants?: any[];
  images?: string[];
}

export const MOCK_PRODUCTS: TestProduct[] = [
  {
    id: 'prod-pla-pro-01',
    name: 'PLA Pro Single Colour Filament 1kg',
    slug: 'pla-pro-single-colour-1kg',
    price: 899,
    mrp: 1299,
    stock: 50,
    codAvailable: true,
    weightInGrams: 1000,
    categoryIds: ['cat-filaments'],
    isActive: true,
    images: ['https://storage.googleapis.com/test-bucket/products/pla-pro-black.jpg']
  },
  {
    id: 'prod-carbon-fiber-02',
    name: 'Carbon Fiber High-Temp Filament 1kg',
    slug: 'carbon-fiber-high-temp-1kg',
    price: 1999,
    mrp: 2799,
    stock: 25,
    codAvailable: true,
    weightInGrams: 1000,
    categoryIds: ['cat-filaments', 'cat-engineering'],
    isActive: true,
    images: ['https://storage.googleapis.com/test-bucket/products/cf-high-temp.jpg']
  },
  {
    id: 'prod-industrial-printer-03',
    name: 'Industrial CoreXY 3D Printer Pro',
    slug: 'industrial-corexy-3d-printer-pro',
    price: 65000,
    mrp: 85000,
    stock: 5,
    codAvailable: false, // High-value machine: COD strictly disabled
    weightInGrams: 18000,
    categoryIds: ['cat-3d-printers'],
    isActive: true,
    images: ['https://storage.googleapis.com/test-bucket/products/corexy-pro.jpg']
  },
  {
    id: 'prod-hotend-brass-04',
    name: 'Hardened Steel Nozzle 0.4mm',
    slug: 'hardened-steel-nozzle-04mm',
    price: 450,
    mrp: 600,
    stock: 120,
    codAvailable: true,
    weightInGrams: 50,
    categoryIds: ['cat-spare-parts'],
    isActive: true,
    images: ['https://storage.googleapis.com/test-bucket/products/nozzle-steel.jpg']
  }
];

export const MOCK_CATEGORIES = [
  {
    id: 'cat-filaments',
    name: '3D Filaments',
    slug: 'filaments',
    parentId: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 1
  },
  {
    id: 'cat-3d-printers',
    name: '3D Printers',
    slug: '3d-printers',
    parentId: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 2
  },
  {
    id: 'cat-spare-parts',
    name: 'Spare Parts & Accessories',
    slug: 'spare-parts',
    parentId: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 3
  },
  {
    id: 'cat-engineering',
    name: 'Engineering Polymers',
    slug: 'engineering-polymers',
    parentId: 'cat-filaments',
    isActive: true,
    isFeatured: false,
    sortOrder: 4
  }
];

export const MOCK_SHIPPING_SETTINGS = {
  freeShippingThreshold: 999,
  defaultFlatRate: 99,
  weightRules: [
    { fromGrams: 0, toGrams: 500, charge: 60 },
    { fromGrams: 501, toGrams: 1000, charge: 99 },
    { fromGrams: 1001, toGrams: 2000, charge: 160 },
    { fromGrams: 2001, toGrams: 5000, charge: 300 }
  ]
};

export const MOCK_WHATSAPP_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '919111381113',
              phone_number_id: '10987654321'
            },
            contacts: [
              {
                profile: { name: 'Customer Tester' },
                wa_id: '919876543210'
              }
            ],
            messages: [
              {
                from: '919876543210',
                id: 'wamid.HBgMOTExMTEzODExMTM3FQIAEhggMkE4MkUzQzk3NTQ3RDZFQkI2',
                timestamp: '1728345600',
                text: { body: 'Hi' },
                type: 'text'
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};
