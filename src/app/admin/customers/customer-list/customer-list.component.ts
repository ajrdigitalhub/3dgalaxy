import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../shared/services/customer.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-customer-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent {
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  // States
  customers = signal<any[]>([]);
  totalCustomers = signal<number>(0);
  isLoading = signal<boolean>(true);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);

  // Filters & Sorting
  searchQuery = signal<string>('');
  selectedType = signal<string>('');
  selectedStatus = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  sortField = signal<string>('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Bulk selections
  selectedCustomerIds = signal<Record<string, boolean>>({});
  isAllSelected = signal<boolean>(false);

  // Modal State for adding customer
  showAddModal = signal<boolean>(false);
  newCustomer = {
    name: '',
    email: '',
    phone: '',
    password: '',
    customerType: 'retail',
    status: 'Active'
  };

  constructor() {
    // Re-fetch when dependencies change
    effect(() => {
      this.fetchCustomers();
    });
  }

  fetchCustomers() {
    this.isLoading.set(true);
    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      customerType: this.selectedType(),
      status: this.selectedStatus(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder()
    };

    this.customerService.getCustomers(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.customers.set(res.data);
          this.totalCustomers.set(res.meta.total);
          this.totalPages.set(res.meta.totalPages);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Failed to load customers.');
        this.isLoading.set(false);
      }
    });
  }

  // Filters & Sorting Handlers
  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onTypeFilter(type: string) {
    this.selectedType.set(type);
    this.currentPage.set(1);
  }

  onStatusFilter(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  onDateChange() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedType.set('');
    this.selectedStatus.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(1);
  }

  onSort(field: string) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('desc');
    }
    this.currentPage.set(1);
  }

  // Pagination Handlers
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  // Navigation
  viewCustomerDetails(id: string) {
    this.router.navigate([`/admin/customers/detail/${id}`]);
  }

  // Actions
  toggleBlockStatus(customer: any) {
    const isBlocked = customer.status === 'Blocked';
    const req$ = isBlocked
      ? this.customerService.unblockCustomer(customer.id)
      : this.customerService.blockCustomer(customer.id);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(isBlocked ? 'Customer unblocked.' : 'Customer blocked.');
          this.fetchCustomers();
        }
      },
      error: () => this.toastService.error('Action failed.')
    });
  }

  deleteCustomer(id: string) {
    if (confirm('Are you sure you want to deactivate this customer account? (Soft delete)')) {
      this.customerService.deleteCustomer(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Customer profile deactivated successfully.');
            this.fetchCustomers();
          }
        },
        error: (err) => {
          this.toastService.error(err.message || 'Cannot delete customer profile.');
        }
      });
    }
  }

  // Selection
  toggleSelectAll(checked: boolean) {
    this.isAllSelected.set(checked);
    const selectionMap: Record<string, boolean> = {};
    if (checked) {
      this.customers().forEach((c) => {
        selectionMap[c.id] = true;
      });
    }
    this.selectedCustomerIds.set(selectionMap);
  }

  toggleSelect(id: string, checked: boolean) {
    this.selectedCustomerIds.update((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[id] = true;
      } else {
        delete updated[id];
      }
      return updated;
    });
  }

  // Bulk Actions
  bulkBlock() {
    const ids = Object.keys(this.selectedCustomerIds());
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to block all ${ids.length} selected customers?`)) {
      let count = 0;
      ids.forEach((id) => {
        this.customerService.blockCustomer(id).subscribe({
          next: () => {
            count++;
            if (count === ids.length) {
              this.toastService.success(`Successfully blocked ${count} customers.`);
              this.selectedCustomerIds.set({});
              this.isAllSelected.set(false);
              this.fetchCustomers();
            }
          }
        });
      });
    }
  }

  bulkDelete() {
    const ids = Object.keys(this.selectedCustomerIds());
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to delete all ${ids.length} selected customers?`)) {
      let count = 0;
      let errorCount = 0;
      ids.forEach((id) => {
        this.customerService.deleteCustomer(id).subscribe({
          next: () => {
            count++;
            if (count + errorCount === ids.length) {
              this.toastService.success(`Deactivated ${count} profiles.`);
              this.selectedCustomerIds.set({});
              this.isAllSelected.set(false);
              this.fetchCustomers();
            }
          },
          error: () => {
            errorCount++;
            if (count + errorCount === ids.length) {
              this.toastService.warning(`Deactivated ${count} profiles. Failed for ${errorCount} due to active orders.`);
              this.selectedCustomerIds.set({});
              this.isAllSelected.set(false);
              this.fetchCustomers();
            }
          }
        });
      });
    }
  }

  // Export CSV
  exportCSV() {
    const headers = [
      'Customer ID',
      'Name',
      'Email',
      'Phone',
      'Type',
      'Status',
      'Registration Date',
      'Total Spend (INR)',
      'Total Orders',
      'Last Order Date'
    ];

    const rows = this.customers().map((c) => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.customerType,
      c.status,
      new Date(c.registrationDate).toLocaleDateString(),
      c.totalSpend,
      c.totalOrders,
      c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Create Customer Modal actions
  openAddModal() {
    this.newCustomer = {
      name: '',
      email: '',
      phone: '',
      password: '',
      customerType: 'retail',
      status: 'Active'
    };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitCustomer() {
    if (!this.newCustomer.name || !this.newCustomer.email) {
      this.toastService.error('Name and Email are mandatory.');
      return;
    }
    this.customerService.createCustomer(this.newCustomer).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Customer created successfully.');
          this.closeAddModal();
          this.fetchCustomers();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.error || 'Failed to create customer.');
      }
    });
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  hasSelections(): boolean {
    return Object.keys(this.selectedCustomerIds()).length > 0;
  }

  getSelectedCount(): number {
    return Object.keys(this.selectedCustomerIds()).length;
  }

  handleImageError(event: any, fallbackUrl: string) {
    if (event && event.target) {
      (event.target as HTMLImageElement).src = fallbackUrl;
    }
  }
}
