import {Injectable, signal, computed, effect, inject, PLATFORM_ID} from '@angular/core';
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
  images: string[];
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
  
  homeLayout = signal<HomeLayoutSection[]>([
    {
      id: "hero-slides",
      name: "Hero Slider Banner",
      visible: true,
      order: 1,
      config: {
        title: "Interactive Sliders"
      }
    },
    {
      id: "quick-nav",
      name: "Quick Navigation Menu",
      visible: true,
      order: 2,
      config: {
        title: "QUICK NAVIGATION",
        linkText: "All Products →",
        linkUrl: "/products",
        items: [
          { id: "3d-printers", name: "3D PRINTERS", icon: "precision_manufacturing" },
          { id: "materials", name: "MATERIALS", icon: "grain" },
          { id: "3d-pens", name: "3D PENS", icon: "gesture" },
          { id: "scanners", name: "3D SCANNERS", icon: "document_scanner" },
          { id: "laser-engravers", name: "ENGRAVERS", icon: "grain" },
          { id: "stem-kits", name: "STEM KITS", icon: "school" },
          { id: "spare-parts", name: "SPARE PARTS", icon: "build" },
          { id: "brahma-farm", name: "PRINT FARM", icon: "hub" }
        ]
      }
    },
    {
      id: "showcase-1",
      name: "Highlight Card (Bambu Lab A1)",
      visible: true,
      order: 3,
      config: {
        productId: "prod-3",
        brand: "BAMBU LAB",
        name: "A1 Combo",
        description: "Experience seamless multicolor 3D printing with the Bambu Lab A1. Featuring full auto calibration and active flow rate compensation. with a spacious 256*256*256 mm³ build volume and compatibility with various filaments.",
        salePrice: 48999,
        mrp: 55000,
        badge: "BEST DEAL",
        image: "https://store.bambulab.com/cdn/shop/files/A1_Combo_600x600.png"
      }
    },
    {
      id: "showcase-2",
      name: "Highlight Card (Creality Sparx)",
      visible: true,
      order: 4,
      config: {
        productId: "prod-6",
        brand: "CREALITY",
        name: "Creality Sparx i7 Combo",
        description: "The Creality Sparx i7 Combo brings professional grade 3D printing to your workshop with its dual extrusion capability and heated build platform. Engineered for precision and speed, this FDM printer handles complex multi-material projects with ease, delivering consistent layer adhesion and dimensional accuracy.",
        salePrice: 48999,
        mrp: 55000,
        badge: "",
        image: "https://store.bambulab.com/cdn/shop/files/X1C_Combo_800x800.png"
      }
    },
    {
      id: "category-view-filament",
      name: "Filament Showcase Row",
      visible: true,
      order: 5,
      config: {
        title: "FILAMENT",
        subtitle: "PREMIUM COMPOUNDED POLYMERS",
        buttonText: "VIEW ALL",
        linkUrl: "/products",
        queryParams: { category: "materials" }
      }
    },
    {
      id: "category-view-spare-parts",
      name: "Spare Parts Showcase Row",
      visible: true,
      order: 6,
      config: {
        title: "SPARE PARTS",
        subtitle: "PRECISION REPLACEMENT NODES",
        buttonText: "VIEW ALL",
        linkUrl: "/products",
        queryParams: { category: "spare-parts" }
      }
    },
    {
      id: "category-view-3d-printer",
      name: "3D Printer Showcase Row",
      visible: true,
      order: 7,
      config: {
        title: "3D PRINTER",
        subtitle: "ADDITIVE FABRICATION UNITS",
        buttonText: "VIEW ALL",
        linkUrl: "/products",
        queryParams: { category: "3d-printers" }
      }
    },
    {
      id: "newsletter",
      name: "Newsletter Subscription Banner",
      visible: true,
      order: 8,
      config: {
        title: "JOIN THE MAKER'S COLLECTIVE",
        description: "Get the latest on layer-shifting breakthroughs, hardware updates, and exclusive cosmic deals."
      }
    },
    {
      id: "featured-innovations",
      name: "Featured Innovation Catalog",
      visible: false,
      order: 9,
      config: {
        title: "Featured Innovations",
        subtitle: "Precision Catalog"
      }
    },
    {
      id: "technology-hubs",
      name: "Technology Category Hubs",
      visible: false,
      order: 10,
      config: {
        title: "Shop by Technology",
        subtitle: "The Laboratory"
      }
    },
    {
      id: "enterprise-solutions",
      name: "Enterprise Industrial Hub",
      visible: false,
      order: 11,
      config: {
        title: "Industrial Solutions",
        subtitle: "Enterprise Protocol"
      }
    },
    {
      id: "partners-marquee",
      name: "Authorized Brand Logos",
      visible: true,
      order: 12,
      config: {
        title: "Authorised Global Partners"
      }
    }
  ]);
  
  // Local UI State
  cart = signal<CartItem[]>([]);
  activeCouponCode = signal<string>('');
  couponDiscountAmount = signal<number>(0);

  shippingAddress = computed(() => this.userProfile()?.address || '');

  seeder = inject(SeederService);
  private platformId = inject(PLATFORM_ID);

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
    // Categories
    onSnapshot(collection(db, 'categories'), (snap) => {
      this.categories.set(snap.docs.map(d => ({ ...d.data() as Category, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'categories'));

    // Brands
    onSnapshot(collection(db, 'brands'), (snap) => {
      this.brands.set(snap.docs.map(d => ({ ...d.data() as Brand, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'brands'));

    // Menu Items
    onSnapshot(collection(db, 'menuItems'), (snap) => {
      const items = snap.docs.map(d => ({ ...d.data() as MenuItem, id: d.id }));
      items.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      this.menuItems.set(items);
    }, err => this.handleFirestoreError(err, 'list', 'menuItems'));

    // Products
    onSnapshot(collection(db, 'products'), (snap) => {
      this.products.set(snap.docs.map(d => ({ ...d.data() as Product, id: d.id })));
    }, err => this.handleFirestoreError(err, 'list', 'products'));

    // Orders (Admins see all, customers see theirs)
    effect(() => {
      const user = this.currentUser();
      if (!this.authReady()) return;

      const role = this.userRole();

      let q;
      if (role === 'admin' || role === 'super-admin') {
        q = query(collection(db, 'orders'), orderBy('date', 'desc'));
      } else if (user) {
        q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('date', 'desc'));
      }

      if (q) {
        onSnapshot(q, (snap) => {
          this.orders.set(snap.docs.map(d => ({ ...d.data() as Order, id: d.id })));
        }, err => this.handleFirestoreError(err, 'list', 'orders'));
      }
    });

    // Settings
    onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        this.settings.set(snap.data() as Settings);
      }
    }, err => this.handleFirestoreError(err, 'get', 'settings/global'));

    // Home Layout Configurations
    onSnapshot(doc(db, 'settings', 'homeLayout'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { sections: HomeLayoutSection[] };
        if (data && Array.isArray(data.sections)) {
          const sorted = [...data.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
          this.homeLayout.set(sorted);
        }
      }
    }, err => {
      console.warn('Silent notice: homeLayout rules or missing doc. Default layout loaded as fallback.', err);
    });

    // blogPosts
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

  async addProduct(p: Omit<Product, 'id' | 'stock' | 'reserved' | 'reviews' | 'qnas' | 'slug'> & { stock: number }) {
    const id = `prod-${Date.now()}`;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await setDoc(doc(db, 'products', id), { 
      ...p, 
      id, 
      slug, 
      reserved: 0,
      reviews: [],
      qnas: [],
      createdAt: new Date().toISOString() 
    });
  }

  async editProduct(id: string, updated: Partial<Product>) {
    await updateDoc(doc(db, 'products', id), updated);
  }

  async deleteProduct(id: string) {
    await deleteDoc(doc(db, 'products', id));
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
