import {Injectable, signal, computed, effect, inject, PLATFORM_ID, Injector, runInInjectionContext} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { initFirebase, db, auth } from '../firebase';
import { SeederService } from './seeder';
import { ApiService } from './api.service';


export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null; // internal compatibility
  parentId: string | null;   // external compatibility
  display_order: number;
  sortOrder?: number;
  description?: string;
  icon?: string;
  image?: string;
  banner?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner?: string;
  description?: string;
  country?: string;
  active?: boolean;
}

export interface MenuItem {
  id: string;
  parentId: string | null;
  categoryId?: string | null;
  label: string;
  url: string;
  sortOrder: number;
}

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
  verified: boolean;
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
  images: any[];
  specs: Specification[];
  reviews: Review[];
  qnas: QA[];
  featured: boolean;
  is360Supported: boolean;
  tags: string[];
  isExclusive?: boolean;
  warningText?: string;
  avgRating?: number;
  ratingCount?: number;
  variants?: ProductVariant[];
  status?: 'active' | 'draft' | 'out_of_stock';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  openGraphImage?: string;
  features?: any[];
  specifications?: any[];
  downloads?: any[];
  faqs?: any[];
  warranty?: any;
  shipping?: any;
  relatedProducts?: any[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPriceType: 'sale' | 'dealer';
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  mrp: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  trackingNumber?: string;
}

export interface QuoteRequest {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fileName: string;
  fileSize: string; // e.g., "12.4 MB"
  materialType: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin';
  color: string;
  infill: number; // e.g. 20
  layerHeight: number; // e.g. 0.2
  weightGrams: number;
  volumeCm3: number;
  estimatedPrintTimeHours: number;
  notes?: string;
  status: 'submitted' | 'estimated' | 'approved_by_customer' | 'rejected' | 'completed';
  estimatedCost: number;
  adjustmentFee?: number;
  mrpPrice?: number;
  date: string;
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  position: 'top-banner' | 'sidebar' | 'footer' | 'sticky';
  impressions: number;
  clicks: number;
  status: 'active' | 'paused';
  revenuePerClick: number; // mock ad-rev
}

export interface SocialPost {
  id: string;
  username: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  likes: number;
  approved: boolean;
  date: string;
  products_tagged: string[]; // product slugs or ids
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  author: string;
  date: string;
  tags: string[];
}

export interface Campaign {
  id: string;
  title: string;
  type: 'email' | 'whatsapp' | 'push';
  message: string;
  sentCount: number;
  clickedCount: number;
  date: string;
  status: 'sent' | 'scheduled';
}

export interface Settings {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: number;
  fontFamily: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface HomeLayoutSection {
  id: string;
  name: string;
  type?: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface CheckoutRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: string;
}

export interface PrintSpec {
  material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin';
  infillPercent: number;
  layerHeight: number;
  volumeCm3: number;
}

export interface QuotationRequest {
  name: string;
  phone: string;
  email: string;
  fileName: string;
  fileSize: string;
  material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin';
  color: string;
  infill: number;
  layerHeight: number;
  volumeSrc: number;
  notes: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'customer' | 'admin' | 'super-admin';
  active: boolean;
  rewardPoints?: number;
  phone?: string;
  address?: string;
  createdAt?: string;
  profileImage?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  minSpent: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatastoreService {
  // Authentication State
  currentUser = signal<FirebaseUser | null>(null);
  userProfile = signal<UserProfile | null>(null);
  userRole = signal<'guest' | 'customer' | 'admin' | 'super-admin'>('guest');
  authReady = signal<boolean>(false);

  // Global Settings
  settings = signal<Settings>({
    appName: '3D Galaxy Industrial',
    primaryColor: '#2563eb',
    secondaryColor: '#4f46e5',
    accentColor: '#10b981',
    borderRadius: 16,
    fontFamily: 'Inter'
  });

  // Theme Configuration
  theme = signal<'light' | 'dark'>('light');

  // Core Data Signals
  categories = signal<Category[]>([]);
  brands = signal<Brand[]>([]);
  menuItems = signal<MenuItem[]>([]);
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  quotes = signal<QuoteRequest[]>([]);
  advertisements = signal<Advertisement[]>([]);
  blogs = signal<BlogPost[]>([]);
  coupons = signal<Coupon[]>([]);
  socialPosts = signal<SocialPost[]>([]);
  notifications = signal<Campaign[]>([]);
  
  homeLayout = signal<HomeLayoutSection[]>([]);
  
  // Local UI State
  cart = signal<CartItem[]>([]);
  activeCouponCode = signal<string>('');
  couponDiscountAmount = signal<number>(0);

  shippingAddress = computed(() => this.userProfile()?.address || '');

  seeder = inject(SeederService);
  private platformId = inject(PLATFORM_ID);
  api = inject(ApiService);
  private injector = inject(Injector);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      initFirebase().then(() => {
        this.initAuth();
        this.initRealtimeSync();
        this.testConnection();
      });
      
      // Auto-seed if empty (only for super-admin or first run)
      effect(() => {
        if (this.authReady() && this.userRole() === 'super-admin') {
          // Wait for sync
          setTimeout(async () => {
            if (this.products().length === 0 && this.categories().length === 0) {
              console.log('No data found, seeding mock data...');
              this.seeder.seedAll();
            }
            try {
              const layoutDoc = await getDoc(doc(db, 'settings', 'homeLayout'));
              if (!layoutDoc.exists()) {
                console.log('Seeding default home layout config...');
                await setDoc(doc(db, 'settings', 'homeLayout'), { sections: this.homeLayout() });
              }
            } catch (err) {
              console.error('Error auto-seeding home layout:', err);
            }
          }, 2000);
        }
      });
    }
    
    // Sync theme class
    effect(() => {
      this.syncThemeClass(this.theme());
    });

    // Save cart to local storage (still useful for guest persistence)
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('3d-galaxy-cart');
      if (storedCart) try { this.cart.set(JSON.parse(storedCart)); } catch { /* ignore */ }
      
      effect(() => {
        localStorage.setItem('3d-galaxy-cart', JSON.stringify(this.cart()));
      });
    }
  }

  private async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if ((error as Error).message?.includes('client is offline')) {
        console.error("Firebase connection failed: Client offline");
      }
    }
  }

  private initAuth() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          
          // Bootstrap upgrade for owner email
          if (user.email === 'arunjaya1999@gmail.com' && data.role !== 'super-admin') {
            data.role = 'super-admin';
            await updateDoc(doc(db, 'users', user.uid), { role: 'super-admin' });
          }

          this.userProfile.set(data);
          this.userRole.set(data.role || 'customer');
        } else {
          // New user
          const newProfile = {
            id: user.uid,
            name: user.displayName || 'Guest',
            email: user.email,
            role: user.email === 'arunjaya1999@gmail.com' ? 'super-admin' : 'customer',
            rewardPoints: 0,
            active: true,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          this.userProfile.set(newProfile as UserProfile);
          this.userRole.set(newProfile.role as 'guest' | 'customer' | 'admin' | 'super-admin');
        }
      } else {
        this.userProfile.set(null);
        this.userRole.set('guest');
      }
      this.authReady.set(true);
    });
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  async loginWithEmail(email: string, pass: string) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return cred.user;
    } catch (err) {
      console.error('Email signin error:', err);
      throw err;
    }
  }

  async registerWithEmail(email: string, pass: string, name: string) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      await updateProfile(user, { displayName: name });
      
      const newProfile: UserProfile = {
        id: user.uid,
        name: name,
        email: user.email || email,
        role: (user.email === 'arunjaya1999@gmail.com') ? 'super-admin' : 'customer',
        rewardPoints: 0,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), newProfile);
      this.userProfile.set(newProfile);
      this.userRole.set(newProfile.role);
      
      return user;
    } catch (err) {
      console.error('Email registration error:', err);
      throw err;
    }
  }

  async logout() {
    return signOut(auth);
  }

  private initRealtimeSync() {
    // ---- API SYNC BLOCK ----
    this.api.get<Category[]>('/categories').subscribe({
      next: (data) => { if (data) this.categories.set(data); console.log("Loaded Categories", data); },
      error: (e) => console.error(e)
    });

    this.api.get<Brand[]>('/brands').subscribe({
      next: (data) => { if (data) this.brands.set(data); },
      error: (e) => console.error(e)
    });

    this.reloadProducts();

    this.api.get<MenuItem[]>('/menus/tree').subscribe({
      next: (data) => { if (data) this.menuItems.set(data); },
      error: (e) => console.error(e)
    });

    this.api.get<Settings>('/settings').subscribe({
      next: (data) => { if (data) this.settings.set(data); },
      error: (e) => console.error(e)
    });

    this.api.get<any[]>('/homepage').subscribe({
      next: (data) => { if (Array.isArray(data)) this.homeLayout.set(data.map(d => ({ ...d, id: d.id, name: d.name, visible: d.isActive, order: d.sortOrder, type: d.type, config: d.content || d.config || {} }))); },
      error: (e) => console.error(e)
    });

    // Orders
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const role = this.userRole();
        if (!this.authReady()) return;
        this.api.get<Order[]>('/orders').subscribe({
          next: (data) => { if (data) this.orders.set(data); },
          error: (e) => console.error(e)
        });
      });
    });

    // blogPosts (mock fallback)
    onSnapshot(collection(db, 'blogPosts'), (snap) => {
      this.blogs.set(snap.docs.map(d => ({ ...d.data() as BlogPost, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'blogPosts'));

    // socialPosts
    onSnapshot(collection(db, 'socialPosts'), (snap) => {
      this.socialPosts.set(snap.docs.map(d => ({ ...d.data() as SocialPost, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'socialPosts'));

    // Ads
    onSnapshot(collection(db, 'advertisements'), (snap) => {
      this.advertisements.set(snap.docs.map(d => ({ ...d.data() as Advertisement, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'advertisements'));

    // Coupons
    onSnapshot(collection(db, 'coupons'), (snap) => {
      this.coupons.set(snap.docs.map(d => ({ ...d.data() as Coupon, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'coupons'));

    // Quotes
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const user = this.currentUser();
        const role = this.userRole();
        if (!this.authReady()) return;

        let q;
        if (role === 'admin' || role === 'super-admin') {
          q = query(collection(db, 'quotes'), orderBy('date', 'desc'));
        } else if (user && user.email) {
          q = query(collection(db, 'quotes'), where('customerEmail', '==', user.email), orderBy('date', 'desc'));
        }

        if (q) {
          onSnapshot(q, (snap) => {
            this.quotes.set(snap.docs.map(d => ({ ...d.data() as QuoteRequest, id: d.id })));
          }, err => this.handleFirestoreError(err, 'list', 'quotes'));
        }
      });
    });
  }

  private handleFirestoreError(error: unknown, op: string, path: string) {
    const errInfo = {
      error: (error as Error)?.message || String(error),
      operationType: op,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  private syncThemeClass(activeTheme: 'light' | 'dark') {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (activeTheme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }

  toggleTheme() {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  // --- CRUD OPERATIONS ---
  
  async addCategory(cat: Omit<Category, 'id'>) {
    const id = cat.slug || `cat-${Date.now()}`;
    const pId = cat.parent_id || cat.parentId || null;
    await setDoc(doc(db, 'categories', id), { 
      ...cat, 
      id,
      parent_id: pId,
      parentId: pId
    });
  }

  async editCategory(id: string, updated: Partial<Category>) {
    const pId = ('parent_id' in updated) ? updated.parent_id : (('parentId' in updated) ? updated.parentId : undefined);
    const mod: any = { ...updated };
    if (pId !== undefined) {
      mod.parent_id = pId;
      mod.parentId = pId;
    }
    await updateDoc(doc(db, 'categories', id), mod);
  }

  async deleteCategory(id: string) {
    await deleteDoc(doc(db, 'categories', id));
  }

  // --- BRAND CRUD ---
  async addBrand(brand: Omit<Brand, 'id'>) {
    const id = brand.slug || `brand-${Date.now()}`;
    await setDoc(doc(db, 'brands', id), { ...brand, id });
  }

  async editBrand(id: string, updated: Partial<Brand>) {
    await updateDoc(doc(db, 'brands', id), updated);
  }

  async deleteBrand(id: string) {
    await deleteDoc(doc(db, 'brands', id));
  }

  // --- MENU ITEM CRUD ---
  async addMenuItem(item: Omit<MenuItem, 'id'>) {
    const id = `menu-${Date.now()}`;
    await setDoc(doc(db, 'menuItems', id), { ...item, id });
  }

  async editMenuItem(id: string, updated: Partial<MenuItem>) {
    await updateDoc(doc(db, 'menuItems', id), updated);
  }

  async deleteMenuItem(id: string) {
    await deleteDoc(doc(db, 'menuItems', id));
  }

  async addProduct(p: Omit<Product, 'id' | 'stock' | 'reserved' | 'reviews' | 'qnas'> & { stock: number }) {
    const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    return new Promise((resolve, reject) => {
      this.api.post('/products', {
        name: p.name,
        slug,
        sku: p.sku || `SKU-${Date.now()}`,
        description: p.description,
        long_description: p.long_description,
        categoryId: p.category_id,
        brandId: p.brand,
        mrp: p.mrp,
        salePrice: p.sale_price,
        dealerPrice: p.dealer_price,
        stock: p.stock,
        is360Supported: p.is360Supported,
        images: p.images, // Let backend array map handles this
        variants: p.variants,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription
      }).subscribe({
        next: (res) => {
           // Reload
           this.reloadProducts();
           resolve(res);
        },
        error: (e) => reject(e)
      });
    });
  }

  async editProduct(id: string, updated: Partial<Product>) {
    return new Promise((resolve, reject) => {
      this.api.put(`/products/${id}`, {
        name: updated.name,
        slug: updated.slug || (updated.name ? updated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
        sku: updated.sku,
        description: updated.description,
        long_description: updated.long_description,
        categoryId: updated.category_id,
        brandId: updated.brand,
        mrp: updated.mrp,
        salePrice: updated.sale_price,
        dealerPrice: updated.dealer_price,
        stock: updated.stock,
        is360Supported: updated.is360Supported,
        images: updated.images,
        variants: updated.variants,
        seoTitle: updated.seoTitle,
        seoDescription: updated.seoDescription
      }).subscribe({
        next: (res) => {
           this.reloadProducts();
           resolve(res);
        },
        error: (e) => reject(e)
      });
    });
  }

  async deleteProduct(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/products/${id}`).subscribe({
        next: () => {
           this.reloadProducts();
           resolve(true);
        },
        error: (e) => reject(e)
      });
    });
  }

  reloadProducts() {
    this.api?.get<{data: any[]}>('/products').subscribe({
      next: (res) => { 
        if (res && res.data) {
           this.products.set(res.data.map((p: any) => ({
             id: p.id,
             name: p.name,
             slug: p.slug,
             sku: p.sku || '',
             barcode: p.barcode || '',
             category_id: p.categoryId,
             brand: p.brand?.name || p.brandId,
             description: p.description || '',
             long_description: p.description || '',
             mrp: p.basePrice || 0,
             sale_price: p.salePrice || p.basePrice || 0,
             dealer_price: p.dealerPrice || p.salePrice || p.basePrice || 0,
             stock: p.stock || 10,
             reserved: p.reserved || 0,
             images: p.images && p.images.length ? p.images.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i:any)=>i.url) : ['https://picsum.photos/seed/'+p.slug+'/800/800'],
             specs: p.specs || [],
             reviews: p.reviews || [],
             qnas: p.qnas || [],
             featured: false,
             is360Supported: false,
             tags: []
           })));
        } 
      },
      error: (e) => console.error(e)
    });
  }

  // --- COUPON AND BLOG CRUD ---
  async addCoupon(coupon: Coupon) {
    await setDoc(doc(db, 'coupons', coupon.code), coupon);
  }

  async deleteCoupon(code: string) {
    await deleteDoc(doc(db, 'coupons', code));
  }

  async addBlogPost(blog: Omit<BlogPost, 'id'>) {
    const id = 'blog-' + Date.now();
    await setDoc(doc(db, 'blogPosts', id), { ...blog, id });
  }

  async deleteBlogPost(id: string) {
    await deleteDoc(doc(db, 'blogPosts', id));
  }

  async updateSettings(updated: Partial<Settings>) {
    await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
  }

  async updateHomeLayout(sections: HomeLayoutSection[]) {
    const sorted = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
    // Assign incremental order values nicely so there is no collision
    sorted.forEach((section, index) => {
      section.order = index + 1;
    });
    this.homeLayout.set(sorted);
    await setDoc(doc(db, 'settings', 'homeLayout'), { sections: sorted });
  }

  // --- COMPATIBILITY MOCK WRAPPERS (to prevent breaking legacy views) ---
  activeUser = computed(() => {
    const profile = this.userProfile();
    return profile || {
      name: 'Guest Maker',
      email: '',
      phone: '',
      rewardPoints: 0,
      shippingAddress: ''
    };
  });

  // --- CART OPERATIONS ---
  addToCart(product: Product, quantity = 1) {
    this.cart.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      const role = this.userRole();
      const priceType = (role === 'admin' || role === 'super-admin') ? 'dealer' : 'sale';
      return [...items, { product, quantity, selectedPriceType: priceType }];
    });
    this.recalcDiscount();
  }

  updateCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      this.cart.update(items => items.filter(i => i.product.id !== productId));
    } else {
      this.cart.update(items => items.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
    this.recalcDiscount();
  }

  applyCoupon(code: string): boolean {
    const matched = this.coupons().find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (matched) {
      const sub = this.cartSubtotal();
      if (sub >= matched.minSpent) {
        this.activeCouponCode.set(matched.code);
        const discount = Math.round((sub * matched.discountPercent) / 100);
        this.couponDiscountAmount.set(discount);
        return true;
      }
    }
    return false;
  }

  removeCoupon() {
    this.activeCouponCode.set('');
    this.couponDiscountAmount.set(0);
  }

  cartSubtotal = computed(() => {
    return this.cart().reduce((sum, item) => {
      const price = item.selectedPriceType === 'dealer' ? item.product.dealer_price : item.product.sale_price;
      return sum + (price * item.quantity);
    }, 0);
  });

  cartMRPtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + (item.product.mrp * item.quantity), 0);
  });

  cartShipping = computed(() => {
    const sub = this.cartSubtotal();
    if (sub === 0) return 0;
    return sub > 4999 ? 0 : 150;
  });

  cartTax = computed(() => {
    return Math.round(this.cartSubtotal() * 0.18);
  });

  cartGrandTotal = computed(() => {
    return this.cartSubtotal() - this.couponDiscountAmount() + this.cartShipping() + this.cartTax();
  });

  recalcDiscount() {
    const code = this.activeCouponCode();
    if (code) {
      const matched = this.coupons().find(c => c.code.toUpperCase() === code.toUpperCase());
      if (matched && this.cartSubtotal() >= matched.minSpent) {
        this.couponDiscountAmount.set(Math.round((this.cartSubtotal() * matched.discountPercent) / 100));
      } else {
        this.removeCoupon();
      }
    }
  }

  async checkoutCart(customerDetails: CheckoutRequest) {
    const user = this.currentUser();
    
    const sub = this.cartSubtotal();
    const disk = this.couponDiscountAmount();
    const ship = this.cartShipping();
    const tax = this.cartTax();
    const grand = this.cartGrandTotal();

    const orderNum = 'ORD-' + Math.floor(Math.random() * 1000000);
    const docId = `ord-${Date.now()}`;
    
    const newOrder = {
      id: docId,
      orderNumber: orderNum,
      userId: user?.uid || 'guest',
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      customerEmail: customerDetails.email,
      shippingAddress: customerDetails.address,
      items: this.cart().map(i => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.selectedPriceType === 'dealer' ? i.product.dealer_price : i.product.sale_price,
        mrp: i.product.mrp
      })),
      subtotal: sub,
      discount: disk,
      couponCode: this.activeCouponCode() || null,
      shippingFee: ship,
      tax: tax,
      grandTotal: grand,
      status: 'pending',
      date: new Date().toISOString(),
      paymentMethod: customerDetails.paymentMethod,
      paymentStatus: 'paid'
    };

    await setDoc(doc(db, 'orders', docId), newOrder);

    // Update stock levels
    for (const item of this.cart()) {
      const prodRef = doc(db, 'products', item.product.id);
      await updateDoc(prodRef, {
        stock: Math.max(0, item.product.stock - item.quantity)
      });
    }

    // Reward points
    if (user && this.userProfile()) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        rewardPoints: (this.userProfile()?.rewardPoints || 0) + Math.floor(grand / 100)
      });
    }

    this.cart.set([]);
    this.activeCouponCode.set('');
    this.couponDiscountAmount.set(0);

    return newOrder;
  }

  // --- VOLUMETRIC 3D PRINT CALCULATOR ---
  calculate3DPrintCost(params: PrintSpec) {
    const density = params.material === 'Resin' ? 1.1 : 1.25;
    const infillFactor = (20 + params.infillPercent * 0.8) / 100;
    const estimatedWeight = Math.round(params.volumeCm3 * density * infillFactor * 10) / 10;

    let pricePerGram = 1.0;
    switch (params.material) {
      case 'PLA': pricePerGram = 2.5; break;
      case 'PETG': pricePerGram = 3.2; break;
      case 'ABS': pricePerGram = 3.5; break;
      case 'TPU': pricePerGram = 4.8; break;
      case 'Resin': pricePerGram = 7.5; break;
    }

    const materialCost = estimatedWeight * pricePerGram;
    const printHoursFactor = (0.2 / (params.layerHeight || 0.2));
    const estimatedHours = Math.round((params.volumeCm3 * 0.05 * printHoursFactor) * 10) / 10;
    const machineFee = estimatedHours * 150;
    const baseCost = Math.round(materialCost + machineFee);
    const gstTax = Math.round(baseCost * 0.18);
    const grandCost = baseCost + gstTax;

    return {
      weightGrams: estimatedWeight,
      hours: Math.max(1, estimatedHours),
      materialCost: Math.round(materialCost),
      serviceFee: Math.round(machineFee),
      gstTax: gstTax,
      totalCost: grandCost
    };
  }

  async submitQuotation(payload: QuotationRequest) {
    const costDetails = this.calculate3DPrintCost({
      material: payload.material,
      infillPercent: payload.infill,
      layerHeight: payload.layerHeight,
      volumeCm3: payload.volumeSrc
    });

    const docId = `q-${Date.now()}`;
    const newQuote: QuoteRequest = {
      id: docId,
      quoteNumber: '3DG-PRNT-' + Math.floor(1000 + Math.random() * 9000),
      customerName: payload.name,
      customerPhone: payload.phone,
      customerEmail: payload.email,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      materialType: payload.material,
      color: payload.color,
      infill: payload.infill,
      layerHeight: payload.layerHeight,
      weightGrams: costDetails.weightGrams,
      volumeCm3: payload.volumeSrc,
      estimatedPrintTimeHours: costDetails.hours,
      notes: payload.notes,
      status: 'estimated',
      estimatedCost: costDetails.totalCost,
      mrpPrice: Math.round(costDetails.totalCost * 1.25),
      date: new Date().toISOString()
    };

    await setDoc(doc(db, 'quotes', docId), newQuote);
    return newQuote;
  }

  // --- ANALYTICS KPI ---
  analyticsKPI = computed(() => {
    const sales = this.orders()
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.grandTotal, 0);
    
    const aov = this.orders().length > 0 ? Math.round(sales / this.orders().length) : 0;
    
    const adRevenue = this.advertisements()
      .reduce((sum, ad) => sum + (ad.clicks * (ad.revenuePerClick || 0)), 0);

    return {
      totalSales: sales,
      aov: aov,
      completedOrdersCount: this.orders().filter(o => o.status === 'delivered' || o.status === 'processing').length,
      conversionRate: 3.42,
      adRevenue: Math.round(adRevenue),
      quoteSubmissionsCount: this.quotes().length
    };
  });

  categoryCounts = computed(() => {
    const counts: Record<string, number> = {};
    this.products().forEach(p => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      if (p.subcategory_id) {
        counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
      }
    });

    this.categories().forEach(cat => {
      if (!cat.parent_id) {
        const children = this.categories().filter(c => c.parent_id === cat.id);
        let total = counts[cat.id] || 0;
        children.forEach(child => {
          total += (counts[child.id] || 0);
        });
        counts[cat.id] = total;
      }
    });

    return counts;
  });

  async recordAdClick(id: string) {
    const adDoc = doc(db, 'advertisements', id);
    const ad = this.advertisements().find(a => a.id === id);
    if (ad) {
      await updateDoc(adDoc, {
        clicks: (ad.clicks || 0) + 1
      });
    }
  }

  async recordAdImpression(id: string) {
    const adDoc = doc(db, 'advertisements', id);
    const ad = this.advertisements().find(a => a.id === id);
    if (ad) {
      await updateDoc(adDoc, {
        impressions: (ad.impressions || 0) + 1
      });
    }
  }

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    await updateDoc(doc(db, 'orders', orderId), { status, trackingNumber });
  }

  async updateQuoteStatus(quoteId: string, status: string) {
    await updateDoc(doc(db, 'quotes', quoteId), { status });
  }

  async updateProductStock(productId: string, stock: number) {
    await updateDoc(doc(db, 'products', productId), { stock });
  }

  async approveQuote(id: string) {
    await updateDoc(doc(db, 'quotes', id), { status: 'approved_by_customer' });
  }

  async rejectQuote(id: string) {
    await updateDoc(doc(db, 'quotes', id), { status: 'rejected' });
  }
}
