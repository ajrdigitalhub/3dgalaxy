import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, UserProfile } from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './account.html'
})
export class Account {
  toastService = inject(ToastService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  fb = inject(FormBuilder);

  api = inject(ApiService);

  profile = this.ds.userProfile;
  myOrders = signal<any[]>([]);
  wishlist = signal<any[]>([]);
  
  activeTab = signal('dashboard');
  
  tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/account' },
    { id: 'orders', label: 'My Orders', icon: 'local_shipping', path: '/account/orders' },
    { id: 'wishlist', label: 'Wishlist', icon: 'favorite', path: '/account/wishlist' },
    { id: 'addresses', label: 'Addresses', icon: 'location_on', path: '/account/addresses' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', path: '/account/notifications' },
    { id: 'reviews', label: 'Reviews', icon: 'star', path: '/account/reviews' },
    { id: 'profile', label: 'Profile Settings', icon: 'person', path: '/account/profile' },
    { id: 'security', label: 'Security', icon: 'lock', path: '/account/security' },
  ];

  profileForm: FormGroup;
  passwordForm: FormGroup;
  activeInvoice = signal<any>(null);

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      gender: [''],
      dateOfBirth: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

    effect(() => {
      const u = this.profile();
      if (!u && this.ds.authReady() && !this.ds.currentUser()) {
        this.router.navigate(['/login']);
      } else if (u) {
        const parts = u.name ? u.name.split(' ') : [];
        this.profileForm.patchValue({
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: u.email || '',
          phone: u.phone || ''
        });
        this.fetchMyOrders();
        this.fetchWishlist();
      }
    });
  }

  ngOnInit() {
    this.route.url.subscribe(url => {
      const path = url.length > 0 ? url[url.length - 1].path : 'dashboard';
      if (this.tabs.some(t => t.id === path)) {
        this.activeTab.set(path);
      } else if (path === 'account') {
        this.activeTab.set('dashboard');
      }
    });
  }

  async fetchMyOrders() {
    try {
      const resp = await this.api.get<any>('/orders/my-orders').toPromise();
      const orders = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : []);
      if (orders) {
        this.myOrders.set(orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: new Date(o.createdAt).toLocaleDateString(),
          status: o.status ? o.status.toLowerCase() : 'pending',
          items: (o.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || 'Product',
            quantity: i.quantity,
            price: i.unitPrice || i.price
          })),
          grandTotal: o.totalAmount,
          subtotal: o.totalAmount - o.taxAmount - o.shippingAmount + o.discountAmount,
          tax: o.taxAmount,
          shippingFee: o.shippingAmount,
          discount: o.discountAmount,
          trackingNumber: null,
          paymentMethod: o.payments && o.payments.length > 0 ? o.payments[0].paymentMethod : 'Unknown',
          shippingAddress: 'See details in actual invoice'
        })));
      }
    } catch(e) {
      this.toastService.warning('Failed to load orders');
    }
  }

  async fetchWishlist() {
    try {
      const resp: any = await this.api.get('/wishlist').toPromise();
      if (resp?.success) {
        this.wishlist.set(resp.data);
      }
    } catch (e) {
      this.toastService.warning('Failed to load wishlist');
    }
  }

  async removeFromWishlist(productId: string) {
    try {
      const resp: any = await this.api.delete(`/wishlist/${productId}`).toPromise();
      if (resp?.success) {
        this.toastService.success('Removed from wishlist');
        this.wishlist.update(items => items.filter(i => i.productId !== productId));
      }
    } catch(e) {
      this.toastService.error('Failed to remove from wishlist');
    }
  }

  addToCartFromWishlist(item: any) {
    this.ds.addToCart(item.product);
    this.removeFromWishlist(item.productId);
    this.router.navigate(['/cart']);
  }

  switchTab(tabId: string) {
    this.activeTab.set(tabId);
    if (tabId === 'dashboard') {
      this.router.navigate(['/account']);
    } else {
      this.router.navigate([`/account/${tabId}`]);
    }
  }

  logout() {
    this.ds.logout();
    this.router.navigate(['/']);
  }

  async saveProfile() {
    if (this.profileForm.valid) {
      const { firstName, lastName, phone } = this.profileForm.value;
      const currentPic = this.profile()?.profileImage || '';
      try {
        await this.ds.updateProfileDetails(firstName, lastName, phone, currentPic);
        this.toastService.success('Profile details updated successfully!');
      } catch (err: any) {
        this.toastService.error(`Failed to update profile: ${err.message || err}`);
      }
    }
  }

  async changePassword() {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
      if (newPassword !== confirmPassword) {
        this.toastService.info('New passwords do not match');
        return;
      }
      try {
        await this.ds.changeUserPassword(currentPassword, newPassword);
        this.toastService.success('Password changed successfully!');
        this.passwordForm.reset();
      } catch (err: any) {
        this.toastService.error(`Failed to change password: ${err.message || err}`);
      }
    }
  }

  async uploadImage(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('access_token');
      
      const res = await fetch(`${environment.apiUrl}/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data.url) {
        this.ds.userProfile.update(profile => profile ? { ...profile, profileImage: data.url } : null);
        this.toastService.success('Profile image uploaded successfully.');
      }
    } catch (e: any) {
      this.toastService.error(`Error uploading image: ${e.message}`);
    }
  }
}
