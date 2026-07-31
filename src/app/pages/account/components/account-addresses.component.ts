import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

export interface CustomerAddressItem {
  id?: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  houseNo?: string;
  street?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressType: 'home' | 'office' | 'other' | string;
  isDefault: boolean;
}

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-5 sm:p-8 shadow-xs backdrop-blur space-y-6">
      
      <!-- Top Title Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Saved Locations</p>
          <h2 class="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-white">
            Delivery Addresses
          </h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your saved addresses for fast 1-click checkout.
          </p>
        </div>

        <button
          type="button"
          (click)="openAddModal()"
          class="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer border-none"
        >
          <mat-icon class="scale-90 text-[18px]">add_location_alt</mat-icon>
          <span>Add New Address</span>
        </button>
      </div>

      <!-- Search Bar -->
      @if (addresses().length > 0) {
        <div class="relative w-full sm:w-80">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 scale-75">search</mat-icon>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            placeholder="Search city, state, or name..."
            class="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
        </div>
      }

      <!-- Loading Skeleton -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div *for="let i of [1,2]" class="h-44 animate-pulse rounded-2xl bg-neutral-200/80 dark:bg-neutral-800"></div>
        </div>
      } @else if (filteredAddresses().length === 0) {
        <!-- Empty State -->
        <div class="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950/70 p-12 text-center space-y-4">
          <div class="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center">
            <mat-icon class="text-4xl">location_off</mat-icon>
          </div>
          <div>
            <h3 class="text-lg font-black text-neutral-950 dark:text-white">
              {{ addresses().length === 0 ? 'No addresses saved yet' : 'No addresses match your search' }}
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Add your delivery location to speed up checkout on your future 3D printing orders.
            </p>
          </div>
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-block rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 border-none cursor-pointer"
          >
            Add Address Now
          </button>
        </div>
      } @else {
        <!-- Address Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (addr of filteredAddresses(); track addr.id) {
            <div
              [ngClass]="{
                'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 shadow-md': addr.isDefault,
                'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900': !addr.isDefault
              }"
              class="group relative rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all duration-150 hover:shadow-lg"
            >
              <!-- Card Top Row -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <!-- Type Icon -->
                  <div class="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <mat-icon class="scale-75 text-[18px]">
                      {{ getTypeIcon(addr.addressType) }}
                    </mat-icon>
                  </div>
                  <div>
                    <h3 class="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white">
                      {{ addr.addressType || 'Home' }}
                    </h3>
                    <p class="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                      {{ getDisplayName(addr) }}
                    </p>
                  </div>
                </div>

                <!-- Default Badge -->
                @if (addr.isDefault) {
                  <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                    Default
                  </span>
                }
              </div>

              <!-- Address Details Body -->
              <div class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium space-y-1">
                <p class="font-bold text-neutral-800 dark:text-neutral-200">
                  📞 {{ getDisplayPhone(addr) }}
                </p>
                <p>{{ getDisplayStreet(addr) }}</p>
                @if (addr.addressLine2) {
                  <p>{{ addr.addressLine2 }}</p>
                }
                <p class="font-semibold text-neutral-900 dark:text-white">
                  {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}
                </p>
                <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{{ addr.country }}</p>
              </div>

              <!-- Actions Footer -->
              <div class="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                @if (!addr.isDefault) {
                  <button
                    type="button"
                    (click)="setDefault(addr)"
                    class="text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 border-none bg-transparent cursor-pointer hover:underline"
                  >
                    Set as Default
                  </button>
                } @else {
                  <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <mat-icon class="scale-75 text-[14px]">check_circle</mat-icon> Primary Shipping Address
                  </span>
                }

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="openEditModal(addr)"
                    aria-label="Edit Address"
                    class="h-8 w-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                  >
                    <mat-icon class="scale-75 text-[16px]">edit</mat-icon>
                  </button>

                  <button
                    type="button"
                    (click)="deleteAddress(addr)"
                    aria-label="Delete Address"
                    class="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border-none cursor-pointer transition-colors"
                  >
                    <mat-icon class="scale-75 text-[16px]">delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal Form for Add/Edit Address -->
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div class="w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 class="text-base font-black text-neutral-950 dark:text-white">
              {{ editingAddress() ? 'Edit Delivery Address' : 'Add New Delivery Address' }}
            </h3>
            <button (click)="closeModal()" class="text-neutral-400 hover:text-rose-500 border-none bg-transparent cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="addrForm" (ngSubmit)="saveAddress()" class="space-y-4">
            
            <!-- Address Type Selector -->
            <div class="space-y-1">
              <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Address Type</label>
              <div class="flex items-center gap-2">
                @for (t of ['home', 'office', 'other']; track t) {
                  <button
                    type="button"
                    (click)="addrForm.patchValue({ addressType: t })"
                    [class]="(addrForm.value.addressType === t ? 'bg-orange-500 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300') + ' flex-1 h-9 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5'"
                  >
                    <mat-icon class="scale-75 text-[16px]">{{ getTypeIcon(t) }}</mat-icon>
                    <span>{{ t }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Full Name & Phone -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Full Name *</label>
                <input
                  type="text"
                  formControlName="fullName"
                  placeholder="Rahul Kumar"
                  class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">10-Digit Mobile *</label>
                <input
                  type="tel"
                  formControlName="phone"
                  placeholder="9876543210"
                  class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <!-- House No & Street/Area -->
            <div class="space-y-1">
              <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">House / Flat / Building No. *</label>
              <input
                type="text"
                formControlName="houseNo"
                placeholder="No 12, Block B"
                class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Street / Area / Colony *</label>
              <input
                type="text"
                formControlName="street"
                placeholder="Anna Nagar East"
                class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <!-- Landmark -->
            <div class="space-y-1">
              <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Landmark (Optional)</label>
              <input
                type="text"
                formControlName="landmark"
                placeholder="Near Metro Station"
                class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <!-- Pincode, City, State -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Pincode (6-digit) *</label>
                <input
                  type="text"
                  formControlName="pincode"
                  (input)="onPincodeInput($any($event.target).value)"
                  placeholder="600040"
                  maxlength="6"
                  class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">City *</label>
                <input
                  type="text"
                  formControlName="city"
                  placeholder="Chennai"
                  class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">State *</label>
                <input
                  type="text"
                  formControlName="state"
                  placeholder="Tamil Nadu"
                  class="w-full h-10 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <!-- Default Checkbox -->
            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" formControlName="isDefault" class="h-4 w-4 rounded border-neutral-300 text-orange-500 focus:ring-orange-500" />
              <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">Make this my default shipping address</span>
            </label>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                (click)="closeModal()"
                class="h-9 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold uppercase tracking-wider border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="addrForm.invalid || isSubmitting()"
                class="h-9 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 border-none cursor-pointer disabled:opacity-50"
              >
                {{ isSubmitting() ? 'Saving...' : (editingAddress() ? 'Update Address' : 'Save Address') }}
              </button>
            </div>

          </form>
        </div>
      </div>
    }
  `
})
export class AccountAddressesComponent implements OnInit {
  api = inject(ApiService);
  toastService = inject(ToastService);
  fb = inject(FormBuilder);

  addresses = signal<CustomerAddressItem[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  showModal = signal<boolean>(false);
  editingAddress = signal<CustomerAddressItem | null>(null);
  isSubmitting = signal<boolean>(false);

  addrForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    addressType: ['home', Validators.required],
    houseNo: ['', Validators.required],
    street: ['', Validators.required],
    landmark: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    country: ['India'],
    isDefault: [false],
  });

  filteredAddresses = computed(() => {
    let list = [...this.addresses()];
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (a) =>
          a.city.toLowerCase().includes(query) ||
          a.state.toLowerCase().includes(query) ||
          a.pincode.toLowerCase().includes(query) ||
          this.getDisplayName(a).toLowerCase().includes(query)
      );
    }
    return list;
  });

  ngOnInit() {
    this.fetchAddresses();
  }

  fetchAddresses() {
    this.isLoading.set(true);
    this.api.get<any>('/customer/addresses').subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const data = Array.isArray(res) ? res : res?.data || [];
        this.addresses.set(data);
      },
      error: () => {
        this.isLoading.set(false);
        this.addresses.set([]);
      },
    });
  }

  openAddModal() {
    this.editingAddress.set(null);
    this.addrForm.reset({
      fullName: '',
      phone: '',
      addressType: 'home',
      houseNo: '',
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: this.addresses().length === 0,
    });
    this.showModal.set(true);
  }

  openEditModal(addr: CustomerAddressItem) {
    this.editingAddress.set(addr);
    this.addrForm.patchValue({
      fullName: this.getDisplayName(addr),
      phone: this.getDisplayPhone(addr),
      addressType: addr.addressType || 'home',
      houseNo: addr.houseNo || '',
      street: addr.street || addr.addressLine1 || '',
      landmark: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || (addr as any).postalCode || '',
      country: addr.country || 'India',
      isDefault: !!addr.isDefault,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveAddress() {
    if (this.addrForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.addrForm.value;
    const payload = {
      ...val,
      addressLine1: `${val.fullName} | ${val.phone} | ${val.addressType} | ${val.houseNo} ${val.street}`.trim(),
      addressLine2: val.landmark ? `Near ${val.landmark}` : '',
    };

    const current = this.editingAddress();
    const req$ = current
      ? this.api.put(`/customer/address/${current.id}`, payload)
      : this.api.post('/customer/address', payload);

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showModal.set(false);
        this.toastService.success(current ? 'Address updated!' : 'Address saved!');
        this.fetchAddresses();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toastService.error('Failed to save address.');
      },
    });
  }

  setDefault(addr: CustomerAddressItem) {
    if (!addr.id) return;
    this.api.put(`/customer/address/default/${addr.id}`, {}).subscribe({
      next: () => {
        this.toastService.success('Default address updated!');
        this.fetchAddresses();
      },
      error: () => this.toastService.error('Failed to set default address.'),
    });
  }

  deleteAddress(addr: CustomerAddressItem) {
    if (!addr.id) return;
    if (confirm('Are you sure you want to delete this address?')) {
      this.api.delete(`/customer/address/${addr.id}`).subscribe({
        next: () => {
          this.toastService.success('Address deleted.');
          this.fetchAddresses();
        },
        error: () => this.toastService.error('Failed to delete address.'),
      });
    }
  }

  onPincodeInput(pin: string) {
    const cleanPin = (pin || '').trim();
    if (cleanPin.length === 6) {
      if (cleanPin.startsWith('60') || cleanPin.startsWith('61') || cleanPin.startsWith('62') || cleanPin.startsWith('63')) {
        this.addrForm.patchValue({ city: 'Chennai', state: 'Tamil Nadu' });
      } else if (cleanPin.startsWith('56') || cleanPin.startsWith('57')) {
        this.addrForm.patchValue({ city: 'Bengaluru', state: 'Karnataka' });
      } else if (cleanPin.startsWith('40') || cleanPin.startsWith('41')) {
        this.addrForm.patchValue({ city: 'Mumbai', state: 'Maharashtra' });
      } else if (cleanPin.startsWith('11')) {
        this.addrForm.patchValue({ city: 'New Delhi', state: 'Delhi' });
      } else if (cleanPin.startsWith('50')) {
        this.addrForm.patchValue({ city: 'Hyderabad', state: 'Telangana' });
      }
    }
  }

  getTypeIcon(type?: string) {
    const t = (type || '').toLowerCase();
    if (t === 'home') return 'home';
    if (t === 'office' || t === 'work') return 'business';
    return 'location_on';
  }

  getDisplayName(a: CustomerAddressItem) {
    return a.fullName || 'Valued Customer';
  }

  getDisplayPhone(a: CustomerAddressItem) {
    return a.phone || '';
  }

  getDisplayStreet(a: CustomerAddressItem) {
    if (a.houseNo || a.street) {
      return `${a.houseNo || ''} ${a.street || ''}`.trim();
    }
    return a.addressLine1 || '';
  }
}
