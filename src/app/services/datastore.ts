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
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';


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
  categoryId?: string;
  category?: any;
  subcategory_id?: string;
  brand: string;
  brandId?: string;
  description: string;
  long_description?: string;
  mrp: number;
  basePrice?: number;
  sale_price: number;
  salePrice?: number;
  dealer_price: number;
  dealerPrice?: number;
  stock: number;
  reserved: number;
  images: any[];
  specs: Specification[];
  reviews: Review[];
  qnas: QA[];
  featured: boolean;
  isActive?: boolean;
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
  seo?: any;
  features?: any[];
  specifications?: any[];
  downloads?: any[];
  faqs?: any[];
  warranty?: any;
  shipping?: any;
  relatedProducts?: { relatedProduct: any }[];
  createdAt?: string;
  updatedAt?: string;
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
  
  homepageLoading = signal<boolean>(true);
  categoriesLoading = signal<boolean>(true);
  bannersLoading = signal<boolean>(true);
  productsLoading = signal<boolean>(true);
  
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
        let firstAuthCheckDone = false;
        // Monitor Firebase Auth State (e.g. Google Sign-In)
        onAuthStateChanged(auth, (user) => {
          if (user) {
            this.currentUser.set(user);
            if (!this.userProfile()) {
              this.userProfile.set({
                id: user.uid,
                name: user.displayName || user.email || 'Google User',
                email: user.email || '',
                role: 'customer',
                active: true,
                phone: user.phoneNumber || '',
                profileImage: user.photoURL || '',
              });
              this.userRole.set('customer');
            }
          } else {
            if (!localStorage.getItem('access_token')) {
              this.currentUser.set(null);
            }
          }

          if (!firstAuthCheckDone) {
            firstAuthCheckDone = true;
            this.initAuth();
          }
        });

        this.initRealtimeSync();
        this.testConnection();
      }).catch((err) => {
        console.error('Firebase failed to initialize:', err);
        // Fallback / safety recovery to unblock UI loading indicators
        this.authReady.set(true);
        this.homepageLoading.set(false);
        this.categoriesLoading.set(false);
        this.bannersLoading.set(false);
        this.productsLoading.set(false);
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
    if (!isPlatformBrowser(this.platformId)) {
      this.authReady.set(true);
      return;
    }

    const token = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');

    if (token) {
      this.fetchProfileAndSetState().then(success => {
        if (!success && refresh) {
          this.refreshJWT(refresh).then(refreshed => {
            if (refreshed) {
              this.fetchProfileAndSetState().then(() => {
                this.authReady.set(true);
              });
            } else {
              this.clearSession();
              this.authReady.set(true);
            }
          });
        } else {
          this.authReady.set(true);
        }
      }).catch(() => {
        this.clearSession();
        this.authReady.set(true);
      });
    } else {
      this.authReady.set(true);
    }
  }

  private async fetchProfileAndSetState(): Promise<boolean> {
    return new Promise((resolve) => {
      this.api.get<{ success: boolean; data: any }>('/profile').subscribe({
        next: (res) => {
          if (res && res.success && res.data) {
            const u = res.data;
            const mappedProfile: UserProfile = {
              id: u.id,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              role: this.mapRole(u.role || (u.roles && u.roles[0]?.role?.name)),
              active: u.isActive !== false,
              phone: u.mobile || '',
              profileImage: u.profileImage || '',
              createdAt: u.createdAt
            };
            this.userProfile.set(mappedProfile);
            this.userRole.set(mappedProfile.role);
            this.currentUser.set({
              uid: mappedProfile.id,
              email: mappedProfile.email,
              displayName: mappedProfile.name,
              phoneNumber: mappedProfile.phone,
              photoURL: mappedProfile.profileImage
            } as any);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => {
          resolve(false);
        }
      });
    });
  }

  private mapRole(roleName: string | undefined): 'guest' | 'customer' | 'admin' | 'super-admin' {
    if (!roleName) return 'customer';
    const normalized = roleName.toLowerCase().replace(/[^a-z]+/g, '');
    if (normalized.includes('superadmin')) return 'super-admin';
    if (normalized.includes('admin')) return 'admin';
    if (normalized.includes('manager')) return 'admin';
    return 'customer';
  }

  private async refreshJWT(refreshTokenStr: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.api.post<{ accessToken: string }>('/auth/refresh-token', { token: refreshTokenStr }).subscribe({
        next: (res) => {
          if (res && res.accessToken) {
            localStorage.setItem('access_token', res.accessToken);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => resolve(false)
      });
    });
  }

  private clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.userProfile.set(null);
    this.currentUser.set(null);
    this.userRole.set('guest');
    signOut(auth).catch((err) => console.warn('Firebase signOut non-fatal warning:', err));
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  async loginWithEmail(email: string, pass: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.post<any>('/auth/login', { email, password: pass }).subscribe({
        next: (res) => {
          if (res && res.success && res.data) {
            const data = res.data;
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);
            
            const u = data.user;
            const mappedProfile: UserProfile = {
              id: u.id,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              role: this.mapRole(u.role),
              active: u.isActive !== false,
              phone: u.mobile || '',
              profileImage: u.profileImage || '',
            };
            this.userProfile.set(mappedProfile);
            this.userRole.set(mappedProfile.role);
            this.currentUser.set({
              uid: mappedProfile.id,
              email: mappedProfile.email,
              displayName: mappedProfile.name,
              phoneNumber: mappedProfile.phone,
              photoURL: mappedProfile.profileImage
            } as any);
            resolve(mappedProfile);
          } else {
            reject(new Error('Authentication returned invalid schema'));
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  async registerWithEmail(email: string, pass: string, name: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.post<any>('/auth/register', { email, password: pass, name }).subscribe({
        next: (res) => {
          const accessToken = res.accessToken || res.data?.accessToken;
          const refreshToken = res.refreshToken || res.data?.refreshToken;
          const userObj = res.user || res.data?.user;

          if (accessToken) {
            localStorage.setItem('access_token', accessToken);
          }
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }

          if (userObj) {
            const mappedProfile: UserProfile = {
              id: userObj.id,
              name: `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.email || name,
              email: userObj.email,
              role: this.mapRole(userObj.role),
              active: true,
              phone: userObj.mobile || '',
              profileImage: userObj.profileImage || '',
            };
            this.userProfile.set(mappedProfile);
            this.userRole.set(mappedProfile.role);
            this.currentUser.set({
              uid: mappedProfile.id,
              email: mappedProfile.email,
              displayName: mappedProfile.name,
              phoneNumber: mappedProfile.phone,
              photoURL: mappedProfile.profileImage
            } as any);
            resolve(mappedProfile);
          } else {
            this.loginWithEmail(email, pass).then(resolve).catch(reject);
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  async logout() {
    return new Promise<void>((resolve) => {
      this.api.post('/auth/logout', {}).subscribe({
        next: () => {
          this.clearSession();
          resolve();
        },
        error: () => {
          this.clearSession();
          resolve();
        }
      });
    });
  }

  async forgotPassword(email: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.post('/auth/forgot-password', { email }).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  async resetPassword(email: string, token: string, pass: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.post('/auth/reset-password', { email, token, newPassword: pass }).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  async updateProfileDetails(firstName: string, lastName: string, mobile: string, profileImage: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.put<any>('/profile', { firstName, lastName, mobile, profileImage }).subscribe({
        next: (res) => {
          if (res && res.success && res.data) {
            const u = res.data;
            const mappedProfile: UserProfile = {
              id: u.id,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              email: u.email,
              role: this.userRole(),
              active: u.isActive !== false,
              phone: u.mobile || '',
              profileImage: u.profileImage || '',
              createdAt: u.createdAt
            };
            this.userProfile.set(mappedProfile);
            resolve(mappedProfile);
          } else {
            resolve(null);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  async changeUserPassword(oldPass: string, newPass: string) {
    return new Promise<any>((resolve, reject) => {
      this.api.put<any>('/profile/change-password', { oldPassword: oldPass, newPassword: newPass }).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  private initRealtimeSync() {
    // ---- API SYNC BLOCK ----
    this.categoriesLoading.set(true);
    this.api.get<Category[]>('/categories').pipe(
      catchError((err) => {
        console.error('Error loading categories:', err);
        return of([]);
      }),
      finalize(() => {
        this.categoriesLoading.set(false);
      })
    ).subscribe({
      next: (data) => { if (data) this.categories.set(data); console.log("Loaded Categories", data); },
      error: (e) => console.error(e)
    });

    this.api.get<Brand[]>('/brands').pipe(
      catchError((err) => {
        console.error('Error loading brands:', err);
        return of([]);
      })
    ).subscribe({
      next: (data) => { if (data) this.brands.set(data); },
      error: (e) => console.error(e)
    });

    this.reloadProducts();

    this.api.get<MenuItem[]>('/menus/tree').pipe(
      catchError((err) => {
        console.error('Error loading menus/tree:', err);
        return of([]);
      })
    ).subscribe({
      next: (data) => { if (data) this.menuItems.set(data); },
      error: (e) => console.error(e)
    });

    this.api.get<Settings>('/settings').pipe(
      catchError((err) => {
        console.error('Error loading settings:', err);
        return of(null as any);
      })
    ).subscribe({
      next: (data) => { if (data) this.settings.set(data); },
      error: (e) => console.error(e)
    });

    this.homepageLoading.set(true);
    this.api.get<any[]>('/homepage').pipe(
      catchError((err) => {
        console.error('Error loading homepage:', err);
        return of([]);
      }),
      finalize(() => {
        this.homepageLoading.set(false);
      })
    ).subscribe({
      next: (data) => { 
        if (Array.isArray(data) && data.length > 0) {
          this.homeLayout.set(data.map(d => ({ ...d, id: d.id, name: d.name, visible: d.isActive, order: d.sortOrder, type: d.type, config: d.content || d.config || {} }))); 
        } else {
          this.homeLayout.set([
            { id: 'hero-1', name: 'Hero', type: 'HERO', visible: true, order: 1, config: {} },
            { id: 'cat-2', name: 'Categories', type: 'CATEGORIES', visible: true, order: 2, config: {} },
            { id: 'feat-3', name: 'Featured Products', type: 'FEATURED_PRODUCTS', visible: true, order: 3, config: {} },
            { id: 'best-4', name: 'Best Sellers', type: 'BEST_SELLERS', visible: true, order: 4, config: {} },
            { id: 'brands-5', name: 'Brands', type: 'BRANDS', visible: true, order: 5, config: {} }
          ]);
        }
      },
      error: (e) => console.error(e)
    });

    // Orders
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const role = this.userRole();
        if (!this.authReady()) return;
        this.api.get<Order[]>('/orders').pipe(
          catchError((err) => {
            console.error('Error loading orders:', err);
            return of([]);
          })
        ).subscribe({
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
    this.bannersLoading.set(true);
    onSnapshot(collection(db, 'advertisements'), (snap) => {
      this.advertisements.set(snap.docs.map(d => ({ ...d.data() as Advertisement, id: d.id })));
      this.bannersLoading.set(false);
    }, err => {
      this.handleFirestoreError(err, 'list', 'advertisements');
      this.bannersLoading.set(false);
    });

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
        userId: auth?.currentUser?.uid,
        email: auth?.currentUser?.email
      }
    };
    console.warn('Firestore Non-Fatal Error:', JSON.stringify(errInfo));
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
           this.reloadProducts(false);
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
           this.reloadProducts(false);
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
           this.reloadProducts(false);
           resolve(true);
        },
        error: (e) => reject(e)
      });
    });
  }

  reloadProducts(showLoader = true) {
    if (showLoader) {
      this.productsLoading.set(true);
    }
    this.api?.get<{data: any[]}>('/products').pipe(
      catchError((err) => {
        console.error('Error loading products:', err);
        return of({ data: [] });
      }),
      finalize(() => {
        this.productsLoading.set(false);
      })
    ).subscribe({
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
