import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { AuthService } from './shared/services/auth.service';
import { SettingsService } from './shared/services/settings.service';

@Component({
  selector: 'app-admin-shell',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  public authService = inject(AuthService);
  public settingsService = inject(SettingsService);
  private router = inject(Router);

  activeTab = signal<string>('dashboard');
  loginLoading = signal<boolean>(false);

  // Sidebar Group Collapsed state
  collapsedGroups = signal<Record<string, boolean>>({
    'Overview': false,
    'Catalog': false,
    'Sales': false,
    'Customers': false,
    'Content': true,
    'Marketing': true,
    'Analytics': true,
    'Settings': true
  });

  sidebarMenu = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid_view', route: 'dashboard' }
      ]
    },
    {
      group: 'Catalog',
      items: [
        { id: 'products', label: 'Products', icon: 'inventory_2', route: 'products' },
        { id: 'categories', label: 'Categories', icon: 'account_tree', route: 'categories' },
        { id: 'brands', label: 'Brands', icon: 'label', route: 'brands' }
      ]
    },
    {
      group: 'Sales',
      items: [
        { id: 'orders', label: 'Orders', icon: 'shopping_bag', route: 'orders' },
        { id: 'draft-orders', label: 'Draft Orders', icon: 'note_add', route: 'orders/draft-orders' },
        { id: 'abandoned-carts', label: 'Abandoned Carts', icon: 'remove_shopping_cart', route: 'orders/abandoned-carts' },
        { id: 'quotes', label: 'Service Inquiries', icon: 'precision_manufacturing', route: 'orders/quotes' }
      ]
    },
    {
      group: 'Customers',
      items: [
        { id: 'customer-list', label: 'Customer List', icon: 'people', route: 'customers/list' },
        { id: 'customer-groups', label: 'Customer Groups', icon: 'groups', route: 'customers/groups' },
        { id: 'reviews', label: 'Reviews', icon: 'reviews', route: 'customers/reviews' }
      ]
    },
    {
      group: 'Content',
      items: [
        { id: 'pages', label: 'Pages', icon: 'article', route: 'content/pages' },
        { id: 'blogs', label: 'Blogs', icon: 'feed', route: 'content/blogs' },
        { id: 'faqs', label: 'FAQs', icon: 'quiz', route: 'content/faqs' },
        { id: 'banners', label: 'Banners', icon: 'view_carousel', route: 'content/banners' },
        { id: 'menu-builder', label: 'Menu Builder', icon: 'menu', route: 'content/menu-builder' },
        { id: 'homepage-builder', label: 'Homepage Builder', icon: 'design_services', route: 'content/homepage-builder' }
      ]
    },
    {
      group: 'Marketing',
      items: [
        { id: 'coupons', label: 'Coupons', icon: 'local_offer', route: 'marketing/coupons' },
        { id: 'promotions', label: 'Promotions', icon: 'ads_click', route: 'marketing/promotions' },
        { id: 'email-campaigns', label: 'Email Campaigns', icon: 'email', route: 'marketing/email-campaigns' },
        { id: 'push-notifications', label: 'Push Notifications', icon: 'notifications_active', route: 'marketing/push-notifications' }
      ]
    },
    {
      group: 'Analytics',
      items: [
        { id: 'sales-reports', label: 'Sales Reports', icon: 'analytics', route: 'analytics/sales-reports' }
      ]
    },
    {
      group: 'Settings',
      items: [
        { id: 'store-settings', label: 'Store Settings', icon: 'store', route: 'settings/store-settings' },
        { id: 'theme-settings', label: 'Theme Settings', icon: 'brush', route: 'settings/theme-settings' },
        { id: 'payment-settings', label: 'Payment Settings', icon: 'payment', route: 'settings/payment-settings' },
        { id: 'shipping-settings', label: 'Shipping Settings', icon: 'local_shipping', route: 'settings/shipping-settings' },
        { id: 'tax-settings', label: 'Tax Settings', icon: 'percent', route: 'settings/tax-settings' },
        { id: 'user-management', label: 'User Management', icon: 'settings/user-management', route: 'settings/user-management' },
        { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'gavel', route: 'settings/roles-permissions' }
      ]
    }
  ];

  storeName = computed(() => this.settingsService.settings().appName || '3D Galaxy Store');

  constructor() {
    this.updateActiveTab(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateActiveTab(event.url);
    });
  }

  private updateActiveTab(url: string) {
    const segments = url.split('/');
    if (segments.length > 2) {
      const feature = segments[2];
      const sub = segments[3];
      if (feature === 'orders' && sub) {
        this.activeTab.set(sub);
      } else if (feature === 'customers' && sub) {
        if (sub === 'list') this.activeTab.set('customer-list');
        else if (sub === 'groups') this.activeTab.set('customer-groups');
        else this.activeTab.set(sub);
      } else if (feature === 'content' && sub) {
        this.activeTab.set(sub);
      } else if (feature === 'marketing' && sub) {
        this.activeTab.set(sub);
      } else if (feature === 'settings' && sub) {
        this.activeTab.set(sub);
      } else if (feature === 'analytics' && sub) {
        this.activeTab.set(sub);
      } else {
        this.activeTab.set(feature);
      }
    } else {
      this.activeTab.set('dashboard');
    }
  }

  toggleGroup(group: string) {
    this.collapsedGroups.update(all => ({
      ...all,
      [group]: !all[group]
    }));
  }

  async login() {
    this.loginLoading.set(true);
    try {
      await this.authService.loginWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      this.loginLoading.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
