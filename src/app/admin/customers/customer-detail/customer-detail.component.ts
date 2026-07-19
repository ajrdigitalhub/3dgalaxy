import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../shared/services/customer.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-customer-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss'
})
export class CustomerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);

  customerId = '';
  customer = signal<any>(null);
  isLoading = signal<boolean>(true);
  activeTab = signal<'overview' | 'orders' | 'addresses' | 'wishlist' | 'reviews' | 'activity' | 'notes'>('overview');

  // Tab Data States
  orders = signal<any[]>([]);
  addresses = signal<any[]>([]);
  wishlist = signal<any[]>([]);
  reviews = signal<any[]>([]);
  activity = signal<any[]>([]);
  notes = signal<any[]>([]);

  // Note form state
  newNoteText = signal<string>('');
  isNotePinned = signal<boolean>(false);

  // Address form state
  showAddressModal = signal<boolean>(false);
  editingAddress = signal<any>(null);
  addressForm = {
    id: '',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false
  };

  // Profile Edit modal
  showEditModal = signal<boolean>(false);
  editProfileForm = {
    name: '',
    email: '',
    phone: '',
    customerType: '',
    gender: '',
    dateOfBirth: ''
  };

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id') || '';
    if (this.customerId) {
      this.fetchCustomerProfile();
      this.fetchTabContent('overview');
    } else {
      this.toastService.error('Customer ID not provided.');
      this.router.navigate(['/admin/customers']);
    }
  }

  fetchCustomerProfile() {
    this.isLoading.set(true);
    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (res) => {
        if (res.success) {
          this.customer.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load profile details.');
        this.isLoading.set(false);
        this.router.navigate(['/admin/customers']);
      }
    });
  }

  setTab(tab: 'overview' | 'orders' | 'addresses' | 'wishlist' | 'reviews' | 'activity' | 'notes') {
    this.activeTab.set(tab);
    this.fetchTabContent(tab);
  }

  fetchTabContent(tab: string) {
    if (tab === 'orders') {
      this.customerService.getCustomerOrders(this.customerId).subscribe({
        next: (res) => { if (res.success) this.orders.set(res.data); }
      });
    } else if (tab === 'addresses') {
      this.customerService.getCustomerAddresses(this.customerId).subscribe({
        next: (res) => { if (res.success) this.addresses.set(res.data); }
      });
    } else if (tab === 'wishlist') {
      this.customerService.getCustomerWishlist(this.customerId).subscribe({
        next: (res) => { if (res.success) this.wishlist.set(res.data); }
      });
    } else if (tab === 'reviews') {
      this.customerService.getCustomerReviews(this.customerId).subscribe({
        next: (res) => { if (res.success) this.reviews.set(res.data); }
      });
    } else if (tab === 'activity') {
      this.customerService.getCustomerActivity(this.customerId).subscribe({
        next: (res) => { if (res.success) this.activity.set(res.data); }
      });
    } else if (tab === 'notes') {
      this.customerService.getCustomerNotes(this.customerId).subscribe({
        next: (res) => { if (res.success) this.notes.set(res.data); }
      });
    }
  }

  // Account Operations
  toggleBlockStatus() {
    const c = this.customer();
    if (!c) return;
    const isBlocked = c.status === 'Blocked';
    const req$ = isBlocked
      ? this.customerService.unblockCustomer(c.id)
      : this.customerService.blockCustomer(c.id);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(isBlocked ? 'Customer unblocked.' : 'Customer blocked.');
          this.fetchCustomerProfile();
        }
      }
    });
  }

  // Notes Management
  addNote() {
    const text = this.newNoteText().trim();
    if (!text) return;

    this.customerService.addCustomerNote(this.customerId, text, this.isNotePinned()).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Note added.');
          this.newNoteText.set('');
          this.isNotePinned.set(false);
          this.fetchTabContent('notes');
        }
      }
    });
  }

  togglePinNote(note: any) {
    this.customerService.pinCustomerNote(this.customerId, note.id, !note.isPinned).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(note.isPinned ? 'Note unpinned.' : 'Note pinned.');
          this.fetchTabContent('notes');
        }
      }
    });
  }

  deleteNote(noteId: string) {
    if (confirm('Delete this note?')) {
      this.customerService.deleteCustomerNote(this.customerId, noteId).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Note deleted.');
            this.fetchTabContent('notes');
          }
        }
      });
    }
  }

  // Address Dialog actions
  openAddressModal(addr?: any) {
    if (addr) {
      this.editingAddress.set(addr);
      this.addressForm = {
        id: addr.id,
        name: addr.name || '',
        phone: addr.phone || '',
        addressLine1: addr.addressLine1 || '',
        addressLine2: addr.addressLine2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        country: addr.country || 'India',
        isDefault: addr.isDefault || false
      };
    } else {
      this.editingAddress.set(null);
      this.addressForm = {
        id: '',
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false
      };
    }
    this.showAddressModal.set(true);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
  }

  submitAddress() {
    // Invoke backend manageAddress API via customer profile endpoint
    // To support inline address saves from admin: we post to `/customers/:customerId/address`
    const payload = {
      addressId: this.addressForm.id || undefined,
      ...this.addressForm
    };

    // Use our native HttpClient address post
    const api = inject(CustomerService);
    // Since our customerService exposes public manageAddress via endpoint `/api/customers/:customerId/address` (from routes/customer.ts)
    // we can invoke it using a custom HTTP wrapper or the direct HttpClient.
    const http = inject(Router); 
    // Wait, let's call the public address endpoint `/api/customers/:customerId/address` via the generic service or directly
    const directHttp = inject(ApiService);
    directHttp.post(`/customers/${this.customerId}/address`, payload).subscribe({
      next: () => {
        this.toastService.success('Address card saved successfully.');
        this.closeAddressModal();
        this.fetchTabContent('addresses');
      },
      error: () => this.toastService.error('Failed to write address.')
    });
  }

  deleteAddress(addressId: string) {
    if (confirm('Are you sure you want to delete this address?')) {
      const directHttp = inject(ApiService);
      directHttp.delete(`/customers/address/${addressId}`).subscribe({
        next: () => {
          this.toastService.success('Address deleted.');
          this.fetchTabContent('addresses');
        }
      });
    }
  }

  // Profile Edit modal
  openEditModal() {
    const c = this.customer();
    if (!c) return;

    this.editProfileForm = {
      name: c.name,
      email: c.email,
      phone: c.phone,
      customerType: c.customerType,
      gender: c.gender || '',
      dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split('T')[0] : ''
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEditProfile() {
    this.customerService.updateCustomer(this.customerId, this.editProfileForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Customer details updated.');
          this.closeEditModal();
          this.fetchCustomerProfile();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.error || 'Failed to update details.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/customers']);
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  replaceUnderscores(str: string): string {
    return (str || '').replace(/_/g, ' ');
  }

  handleImageError(event: any, fallbackUrl: string) {
    if (event && event.target) {
      (event.target as HTMLImageElement).src = fallbackUrl;
    }
  }
}
