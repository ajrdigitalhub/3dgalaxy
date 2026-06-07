export interface ProductVariant {
  id?: string;
  name: string;
  price: number;
  stock: number;
}

export interface Specification {
  label: string;
  value: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  status?: string;
  response?: string;
  productName?: string;
}

export interface QA {
  id: string;
  question: string;
  answer?: string;
  askedBy: string;
  answeredBy?: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  category_id: string;
  subcategory_id?: string;
  brand: string;
  description: string;
  long_description?: string;
  mrp: number;
  sale_price: number;
  dealer_price: number;
  stock: number;
  reserved: number;
  images: string[];
  specs: Specification[];
  reviews: Review[];
  qnas: QA[];
  featured: boolean;
  is360Supported: boolean;
  tags: string[];
  isExclusive?: boolean;
  variants?: ProductVariant[];
  status?: 'active' | 'draft' | 'out_of_stock';
  seoTitle?: string;
  seoDescription?: string;
}
