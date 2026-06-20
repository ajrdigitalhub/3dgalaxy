import {Injectable, signal, computed, effect, inject, PLATFORM_ID, Injector, runInInjectionContext} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { initFirebase, auth } from '../firebase';
import { ApiService } from './api.service';
import { SettingsService } from '../core/services/settings.service';
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

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  weight?: number | null;
  isDefault: boolean;
  isActive: boolean;
  name: string;
  images?: any[];
  options?: any[];
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
  options?: any[];
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
  variant?: ProductVariant;
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
  customerType?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  guestSessionId?: string;
}

export interface QuoteRequest {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fileName: string;
  fileSize: string; // e.g., "12.4 MB"
  materialType: string;
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
  gradientAngle?: string;
  radius?: string;
  accentColor: string;
  borderRadius: number;
  fontFamily: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Custom image properties requested by the user
  appIconUrl?: string;
  loginBgUrl?: string;
  adminBgUrl?: string;
  headerLogoUrl?: string;
  footerLogoUrl?: string;
  mobileLogoUrl?: string;
  darkModeLogoUrl?: string;
  loadingLogoUrl?: string;
  defaultPlaceholderUrl?: string;
  defaultOgImageUrl?: string;
  defaultSocialShareImageUrl?: string;
  razorpayLogoUrl?: string;
  paymentMethodIconsUrl?: string;
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
  material: string;
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
  material: string;
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
  guestSessionId = signal<string>('');
  
  footerData = signal<any>(null);
  footerLoading = signal<boolean>(true);

  shippingAddress = computed(() => this.userProfile()?.address || '');

  private platformId = inject(PLATFORM_ID);
  api = inject(ApiService);
  settingsService = inject(SettingsService);
  private injector = inject(Injector);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.trySyncAuthFromToken();
      let guestId = localStorage.getItem('guest_session_id');
      if (!guestId) {
        const rand = Math.random().toString(16).substring(2, 10);
        guestId = `guest_${rand}`;
        localStorage.setItem('guest_session_id', guestId);
      }
      this.guestSessionId.set(guestId);

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
    // Healthcheck noop or simple ping (all operations have been centralized to the API layer)
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
      this.api.post<any>('/auth/refresh-token', { token: refreshTokenStr }).subscribe({
        next: (res) => {
          const accessToken = res?.accessToken || res?.data?.accessToken;
          const refreshToken = res?.refreshToken || res?.data?.refreshToken;
          if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
              localStorage.setItem('refresh_token', refreshToken);
            }
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

  private decodeJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  private trySyncAuthFromToken() {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = this.decodeJWT(token);
      if (decoded) {
        const role = this.mapRole(decoded.role);
        this.userRole.set(role);
        this.userProfile.set({
          id: decoded.id,
          name: decoded.email,
          email: decoded.email,
          role: role,
          active: true,
          phone: '',
          profileImage: '',
        });
        this.currentUser.set({
          uid: decoded.id,
          email: decoded.email,
          displayName: decoded.email,
          phoneNumber: '',
          photoURL: ''
        } as any);
      }
    }
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

  async registerWithEmail(email: string, pass: string, name: string, mobile: string = '') {
    return new Promise<any>((resolve, reject) => {
      this.api.post<any>('/auth/register', { email, password: pass, name, mobile }).subscribe({
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
    this.reloadPages();
    this.reloadBlogs();
    this.reloadFaqs();
    this.reloadBanners();
    this.reloadCoupons();
    this.reloadSocialPosts();
    this.reloadAdvertisements();
    this.reloadFooter();

    this.api.get<MenuItem[]>('/menus/tree').pipe(
      catchError((err) => {
        console.error('Error loading menus/tree:', err);
        return of([]);
      })
    ).subscribe({
      next: (data) => { if (data) this.menuItems.set(data); },
      error: (e) => console.error(e)
    });

    this.api.get<any>('/settings').pipe(
      catchError((err) => {
        console.error('Error loading settings:', err);
        return of(null as any);
      })
    ).subscribe({
      next: (res) => { 
        if (res) {
          const d = res.data !== undefined ? res.data : res;
          
          let themeData = d.theme;
          if (!themeData) {
            themeData = {
              primaryColor: d.primaryColor || '#d65108',
              secondaryColor: d.secondaryColor || '#1e3a8a',
              accentColor: d.accentColor || '#3B82F6',
              borderRadius: d.borderRadius || '0.75rem',
              fontFamily: d.typography || 'Inter',
              darkMode: d.darkMode || false,
              themeText: d.themeText || '#ffffff'
            };
          }
          this.settings.set(themeData);

          const layout = d.homepage || d.homepageSections;
          if (layout) {
            this.homeLayout.set(layout.sections || [
              { id: 'hero-1', name: 'Hero', type: 'HERO', visible: true, order: 1, config: {} },
              { id: 'cat-2', name: 'Categories', type: 'CATEGORIES', visible: true, order: 2, config: {} },
              { id: 'brands-5', name: 'Brands', type: 'BRANDS', visible: true, order: 3, config: {} },
              { id: 'feat-3', name: 'Featured Products', type: 'FEATURED_PRODUCTS', visible: true, order: 4, config: {} },
              { id: 'launch-4', name: 'Launch Spotlight', type: 'LAUNCH_SPOTLIGHT', visible: true, order: 5, config: {} },
              { id: 'services-6', name: 'Our Services', type: 'SERVICES', visible: true, order: 6, config: {} },
              { id: 'why-7', name: 'Why Choose Us', type: 'WHY_CHOOSE_US', visible: true, order: 7, config: {} },
              { id: 'stats-8', name: 'Statistics', type: 'STATISTICS', visible: true, order: 8, config: {} },
              { id: 'testimonials-9', name: 'Customer Testimonials', type: 'TESTIMONIALS', visible: true, order: 9, config: {} },
              { id: 'video-10', name: 'Video Showcase', type: 'VIDEO_SECTION', visible: true, order: 10, config: {} },
              { id: 'shop-11', name: 'Shop By Category', type: 'SHOP_BY_CATEGORY', visible: true, order: 11, config: {} },
              { id: 'best-12', name: 'Best Sellers', type: 'BEST_SELLERS', visible: true, order: 12, config: {} },
              { id: 'newsletter-13', name: 'Newsletter', type: 'NEWSLETTER', visible: true, order: 13, config: {} }
            ]);
          }
        }
      },
      error: (e) => console.error(e)
    });

    this.homepageLoading.set(false);
    this.homeLayout.set([
      { id: 'hero-1', name: 'Hero', type: 'HERO', visible: true, order: 1, config: {} },
      { id: 'cat-2', name: 'Categories', type: 'CATEGORIES', visible: true, order: 2, config: {} },
      { id: 'brands-5', name: 'Brands', type: 'BRANDS', visible: true, order: 3, config: {} },
      { id: 'feat-3', name: 'Featured Products', type: 'FEATURED_PRODUCTS', visible: true, order: 4, config: {} },
      { id: 'launch-4', name: 'Launch Spotlight', type: 'LAUNCH_SPOTLIGHT', visible: true, order: 5, config: {} },
      { id: 'services-6', name: 'Our Services', type: 'SERVICES', visible: true, order: 6, config: {} },
      { id: 'why-7', name: 'Why Choose Us', type: 'WHY_CHOOSE_US', visible: true, order: 7, config: {} },
      { id: 'stats-8', name: 'Statistics', type: 'STATISTICS', visible: true, order: 8, config: {} },
      { id: 'testimonials-9', name: 'Customer Testimonials', type: 'TESTIMONIALS', visible: true, order: 9, config: {} },
      { id: 'video-10', name: 'Video Showcase', type: 'VIDEO_SECTION', visible: true, order: 10, config: {} },
      { id: 'shop-11', name: 'Shop By Category', type: 'SHOP_BY_CATEGORY', visible: true, order: 11, config: {} },
      { id: 'best-12', name: 'Best Sellers', type: 'BEST_SELLERS', visible: true, order: 12, config: {} },
      { id: 'newsletter-13', name: 'Newsletter', type: 'NEWSLETTER', visible: true, order: 13, config: {} }
    ]);

    // Orders
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const role = this.userRole();
        if (!this.authReady()) return;
        if (role !== 'admin' && role !== 'super-admin') return;
        this.api.get<any>('/orders').pipe(
          catchError((err) => {
            console.error('Error loading orders:', err);
            return of(null as any);
          })
        ).subscribe({
          next: (res: any) => { 
            if (res) {
              const ordersList = Array.isArray(res) ? res : (res.data || []);
              this.orders.set(ordersList.map((o: any) => ({
                ...o,
                customerName: o.customer?.user?.name || o.customer?.user?.firstName || 'Guest',
                customerPhone: o.customer?.user?.phone || 'N/A',
                status: o.status ? o.status.toLowerCase() : 'pending',
                grandTotal: o.totalAmount,
              })));
            }
          },
          error: (e) => console.error(e)
        });
      });
    });

    // Quotes and dynamic auth-triggered reloads
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.authReady()) {
          this.reloadQuotes();
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
  
  reloadCategories() {
    this.api.get<Category[]>('/categories').subscribe(data => { if (data) this.categories.set(data); });
  }

  reloadBrands() {
    this.api.get<Brand[]>('/brands').subscribe(data => { if (data) this.brands.set(data); });
  }

  reloadMenus() {
    this.api.get<MenuItem[]>('/menus/tree').subscribe(data => { if (data) this.menuItems.set(data); });
  }

  // reloadFooter removed

  async addCategory(cat: Omit<Category, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post('/categories', cat).subscribe({
        next: (res) => { this.reloadCategories(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async editCategory(id: string, updated: Partial<Category>) {
    return new Promise((resolve, reject) => {
      this.api.put(`/categories/${id}`, updated).subscribe({
        next: (res) => { this.reloadCategories(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async deleteCategory(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/categories/${id}`).subscribe({
        next: (res) => { this.reloadCategories(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  // --- BRAND CRUD ---
  async addBrand(brand: Omit<Brand, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post('/brands', brand).subscribe({
        next: (res) => { this.reloadBrands(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async editBrand(id: string, updated: Partial<Brand>) {
    return new Promise((resolve, reject) => {
      this.api.put(`/brands/${id}`, updated).subscribe({
        next: (res) => { this.reloadBrands(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async deleteBrand(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/brands/${id}`).subscribe({
        next: (res) => { this.reloadBrands(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  // --- MENU ITEM CRUD ---
  async addMenuItem(item: Omit<MenuItem, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post('/menus', item).subscribe({
        next: (res) => { this.reloadMenus(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async editMenuItem(id: string, updated: Partial<MenuItem>) {
    return new Promise((resolve, reject) => {
      this.api.put(`/menus/${id}`, updated).subscribe({
        next: (res) => { this.reloadMenus(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async deleteMenuItem(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/menus/${id}`).subscribe({
        next: (res) => { this.reloadMenus(); resolve(res); },
        error: (err) => reject(err)
      });
    });
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
        options: p.options,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        specifications: p.specifications || (p as any).specs || [],
        downloads: p.downloads || [],
        features: p.features || [],
        faqs: p.faqs || [],
        warranty: p.warranty || null,
        shipping: p.shipping || null
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
        options: updated.options,
        seoTitle: updated.seoTitle,
        seoDescription: updated.seoDescription,
        specifications: updated.specifications || (updated as any).specs || [],
        downloads: updated.downloads || [],
        features: updated.features || [],
        faqs: updated.faqs || [],
        warranty: updated.warranty || null,
        shipping: updated.shipping || null
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
             long_description: p.long_description || p.description || '',
             mrp: p.basePrice || 0,
             sale_price: p.salePrice || p.basePrice || 0,
             dealer_price: p.dealerPrice || p.salePrice || p.basePrice || 0,
             stock: p.stock || 10,
             reserved: p.reserved || 0,
             images: p.images && p.images.length ? [...p.images].sort((a: any, b: any) => {
               const aPrimary = a && typeof a === 'object' && a.isPrimary ? 1 : 0;
               const bPrimary = b && typeof b === 'object' && b.isPrimary ? 1 : 0;
               if (aPrimary !== bPrimary) return bPrimary - aPrimary;
               const aOrder = a && typeof a === 'object' && typeof a.sortOrder === 'number' ? a.sortOrder : 0;
               const bOrder = b && typeof b === 'object' && typeof b.sortOrder === 'number' ? b.sortOrder : 0;
               return aOrder - bOrder;
             }).map((i: any) => (i && typeof i === 'object' ? i.url : i) || '') : ['https://picsum.photos/seed/'+p.slug+'/800/800'],
             specs: p.specifications && p.specifications.length ? p.specifications.map((s: any) => ({ name: s.name, value: s.value })) : (p.specs || []),
             specifications: p.specifications || [],
             downloads: p.downloads || [],
             features: p.features || [],
             faqs: p.faqs || [],
             warranty: p.warranty || null,
             shipping: p.shipping || null,
             seoTitle: p.seo?.seoTitle || '',
             seoDescription: p.seo?.seoDescription || '',
             reviews: p.reviews || [],
             qnas: p.qnas || [],
             featured: false,
             is360Supported: p.is360Supported || false,
             tags: []
           })));
        } 
      },
      error: (e) => console.error(e)
    });
  }

  // --- COUPON AND BLOG CRUD ---
  async addCoupon(coupon: Coupon) {
    return new Promise((resolve, reject) => {
      this.api.post('/admin/coupons', coupon).subscribe({
        next: (res) => {
          this.reloadCoupons();
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }

  async deleteCoupon(code: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/admin/coupons/${code}`).subscribe({
        next: (res) => {
          this.reloadCoupons();
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }

  reloadCoupons() {
    this.api.get<any>('/admin/coupons').subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.coupons.set(data);
      },
      error: (e) => console.error('Error reloading coupons:', e)
    });
  }

  reloadSocialPosts() {
    this.api.get<any>('/admin/social-posts').subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.socialPosts.set(data);
      },
      error: (e) => console.error('Error reloading social-posts:', e)
    });
  }

  reloadAdvertisements() {
    this.api.get<any>('/admin/advertisements').subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.advertisements.set(data);
      },
      error: (e) => console.error('Error reloading advertisements:', e)
    });
  }

  reloadQuotes() {
    const user = this.currentUser();
    let url = '/admin/quotes';
    if (user && user.email) {
      url += `?email=${encodeURIComponent(user.email)}`;
    }
    this.api.get<any>(url).subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.quotes.set(data);
      },
      error: (e) => console.error('Error reloading quotes:', e)
    });
  }

  pages = signal<any[]>([]);
  faqs = computed(() => this.settingsService.faqs());
  banners = computed(() => this.settingsService.banners());

  reloadPages() {
    this.api.get<any>('/admin/pages').subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.pages.set(data);
      },
      error: (e) => console.error('Error reloading pages:', e)
    });
  }

  reloadBlogs() {
    this.api.get<any>('/admin/blogs').subscribe({
      next: (res: any) => {
        const data = res?.success ? res.data : (res?.data || res);
        if (Array.isArray(data)) this.blogs.set(data);
      },
      error: (e) => console.error('Error reloading blogs:', e)
    });
  }

  reloadFaqs() {
    this.settingsService.loadSettings(true);
  }

  reloadFooter() {
    this.footerLoading.set(false);
  }

  reloadBanners() {
    this.settingsService.loadSettings(true);
    this.bannersLoading.set(false);
  }

  async addBlogPost(blog: Omit<BlogPost, 'id'>) {
    return new Promise((resolve, reject) => {
      this.api.post('/admin/blogs', blog).subscribe({
        next: (res) => { this.reloadBlogs(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async deleteBlogPost(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/admin/blogs/${id}`).subscribe({
        next: (res) => { this.reloadBlogs(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async addPage(page: any) {
    return new Promise((resolve, reject) => {
      this.api.post('/admin/pages', page).subscribe({
        next: (res) => { this.reloadPages(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async editPage(id: string, updated: any) {
    return new Promise((resolve, reject) => {
      this.api.put(`/admin/pages/${id}`, updated).subscribe({
        next: (res) => { this.reloadPages(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async deletePage(id: string) {
    return new Promise((resolve, reject) => {
      this.api.delete(`/admin/pages/${id}`).subscribe({
        next: (res) => { this.reloadPages(); resolve(res); },
        error: (err) => reject(err)
      });
    });
  }

  async addFaq(faq: any) {
    const currentSettings = this.settingsService.getSettings();
    const faqs = [...(currentSettings.faqs || []), { ...faq, id: faq.id || 'faq-' + Date.now() }];
    return this.settingsService.saveSettings({ faqs });
  }

  async deleteFaq(id: string) {
    const currentSettings = this.settingsService.getSettings();
    const faqs = (currentSettings.faqs || []).filter((f: any) => f.id !== id);
    return this.settingsService.saveSettings({ faqs });
  }

  async addBanner(banner: any) {
    const currentSettings = this.settingsService.getSettings();
    const banners = [...(currentSettings.banners || []), { ...banner, id: banner.id || 'ban-' + Date.now() }];
    return this.settingsService.saveSettings({ banners });
  }

  async editBanner(id: string, banner: any) {
    const currentSettings = this.settingsService.getSettings();
    const banners = (currentSettings.banners || []).map((b: any) => b.id === id ? { ...b, ...banner } : b);
    return this.settingsService.saveSettings({ banners });
  }

  async deleteBanner(id: string) {
    const currentSettings = this.settingsService.getSettings();
    const banners = (currentSettings.banners || []).filter((b: any) => b.id !== id);
    return this.settingsService.saveSettings({ banners });
  }

  async updateSettings(updated: Partial<Settings>) {
    return new Promise((resolve, reject) => {
      this.api.put('/admin/settings', { theme: updated }).subscribe({
        next: (res: any) => {
          const data = res?.data?.theme || res;
          if (data) this.settings.set(data);
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }

  async updateHomeLayout(sections: HomeLayoutSection[]) {
    const sorted = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
    // Assign incremental order values nicely so there is no collision
    sorted.forEach((section, index) => {
      section.order = index + 1;
    });
    this.homeLayout.set(sorted);
    return new Promise((resolve, reject) => {
      this.api.put('/admin/settings', { homepage: { sections: sorted } }).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
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
  addToCart(product: Product, quantity = 1, variant?: ProductVariant) {
    this.cart.update(items => {
      const isVariantMatch = (i: CartItem) => {
         if (variant && i.variant) return i.product.id === product.id && i.variant.id === variant.id;
         return i.product.id === product.id;
      };
      
      const existing = items.find(isVariantMatch);
      if (existing) {
        return items.map(i => isVariantMatch(i) ? { ...i, quantity: i.quantity + quantity } : i);
      }
      const role = this.userRole();
      const priceType = (role === 'admin' || role === 'super-admin') ? 'dealer' : 'sale';
      return [...items, { product, variant, quantity, selectedPriceType: priceType }];
    });
    this.recalcDiscount();
  }

  updateCartQty(productId: string, qty: number, variantId?: string) {
    if (qty <= 0) {
      this.cart.update(items => items.filter(i => {
           if (variantId) return !(i.product.id === productId && i.variant?.id === variantId);
           return i.product.id !== productId;
      }));
    } else {
      this.cart.update(items => items.map(i => {
           const match = variantId ? (i.product.id === productId && i.variant?.id === variantId) : (i.product.id === productId);
           return match ? { ...i, quantity: qty } : i;
      }));
    }
    this.recalcDiscount();
  }

  getItemPrice(item: CartItem): number {
      let price = item.selectedPriceType === 'dealer' ? item.product.dealer_price : item.product.sale_price;
      if (item.variant) {
         price = item.variant.salePrice || item.variant.price || price;
      }
      return price;
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
      let price = item.selectedPriceType === 'dealer' ? item.product.dealer_price : item.product.sale_price;
      if (item.variant) {
         price = item.variant.salePrice || item.variant.price || price;
      }
      return sum + (price * item.quantity);
    }, 0);
  });

  cartMRPtotal = computed(() => {
    return this.cart().reduce((sum, item) => {
       const mrp = item.variant?.price || item.product.mrp;
       return sum + (mrp * item.quantity)
    }, 0);
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

    if (localStorage.getItem('access_token')) {
      const itemsPayload = this.cart().map(i => ({
        productId: i.product.id,
        variantId: null,
        quantity: i.quantity
      }));
      const addressPayload = {
        addressLine1: customerDetails.address || 'N/A',
        addressLine2: '',
        city: 'City',
        state: 'State',
        pincode: '400001',
        country: 'India'
      };
      
      this.api.post<any>('/orders', {
        items: itemsPayload,
        shippingAddress: addressPayload,
        billingAddress: addressPayload,
        paymentMethod: customerDetails.paymentMethod
      }).subscribe({
        next: (res) => {
          console.log('Order persisted successfully on SQL:', res);
        },
        error: (err) => {
          console.warn('SQL order persistence skipped, using local fallback:', err);
        }
      });
    }

    this.cart.set([]);
    this.activeCouponCode.set('');
    this.couponDiscountAmount.set(0);

    return newOrder;
  }

  // --- VOLUMETRIC 3D PRINT CALCULATOR ---
  calculate3DPrintCost(params: PrintSpec) {
    const config = this.settingsService.printServiceSettings() || {};
    const materials = config.materials || [];
    const matConfig = materials.find((m: any) => m.name.toLowerCase() === params.material.toLowerCase()) || {};

    const density = matConfig.density !== undefined ? matConfig.density : (params.material === 'Resin' ? 1.1 : 1.25);
    const pricePerGram = matConfig.pricePerGram !== undefined ? matConfig.pricePerGram : 2.5;

    const infillFactor = (20 + params.infillPercent * 0.8) / 100;
    const estimatedWeight = Math.round(params.volumeCm3 * density * infillFactor * 10) / 10;

    const materialCost = estimatedWeight * pricePerGram;
    const printHoursFactor = (0.2 / (params.layerHeight || 0.2));
    const estimatedHours = Math.round((params.volumeCm3 * 0.05 * printHoursFactor) * 10) / 10;

    const machineRate = config.machineFeePerHour !== undefined ? config.machineFeePerHour : 150;
    const machineFee = estimatedHours * machineRate;

    const baseCost = Math.round(materialCost + machineFee);
    const gstRate = config.gstTaxRate !== undefined ? config.gstTaxRate : 18;
    const gstTax = Math.round(baseCost * (gstRate / 100));
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

    return new Promise<QuoteRequest>((resolve, reject) => {
      this.api.post('/admin/quotes', newQuote).subscribe({
        next: () => {
          this.reloadQuotes();
          resolve(newQuote);
        },
        error: (err) => reject(err)
      });
    });
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
    this.api.put(`/admin/advertisements/${id}/click`, {}).subscribe({
      next: () => this.reloadAdvertisements(),
      error: (e) => console.error('Error tracking click:', e)
    });
  }

  async recordAdImpression(id: string) {
    this.api.put(`/admin/advertisements/${id}/impression`, {}).subscribe({
      next: () => this.reloadAdvertisements(),
      error: (e) => console.error('Error tracking impression:', e)
    });
  }

  http = inject(HttpClient);

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    return new Promise((resolve, reject) => {
      this.http.put(`/api/orders/${orderId}/status`, { status }).subscribe({
        next: () => {
          // Refresh orders or optimistically update
          this.orders.update(ords => ords.map(o => o.id === orderId || o.orderNumber === orderId ? { ...o, status: status as any } : o));
          resolve(true);
        },
        error: (err: any) => reject(err)
      });
    });
  }

  async updateQuoteStatus(quoteId: string, status: string) {
    return new Promise((resolve, reject) => {
      this.api.put(`/admin/quotes/${quoteId}`, { status }).subscribe({
        next: () => {
          this.reloadQuotes();
          resolve(true);
        },
        error: (err: any) => reject(err)
      });
    });
  }

  async updateProductStock(productId: string, stock: number) {
    return new Promise((resolve, reject) => {
      this.api.put(`/admin/products/${productId}/stock`, { stock }).subscribe({
        next: () => {
          this.reloadProducts(false);
          resolve(true);
        },
        error: (err) => reject(err)
      });
    });
  }

  async approveQuote(id: string) {
    return this.updateQuoteStatus(id, 'approved_by_customer');
  }

  async rejectQuote(id: string) {
    return this.updateQuoteStatus(id, 'rejected');
  }
}
