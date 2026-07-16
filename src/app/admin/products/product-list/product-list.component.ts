import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ProductService } from "../../shared/services/product.service";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { SearchFilterComponent } from "../../shared/components/search-filter/search-filter.component";
import { DataTableComponent } from "../../shared/components/data-table/data-table.component";
import { ConfirmationDialogComponent } from "../../shared/components/confirmation-dialog/confirmation-dialog.component";
import { ToastService } from "../../../shared/components/toast/toast.service";

@Component({
  selector: "app-admin-product-list",
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    PageHeaderComponent,
    SearchFilterComponent,
    DataTableComponent,
    ConfirmationDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./product-list.component.html",
  styleUrl: "./product-list.component.scss",
})
export class ProductListComponent {
  toastService = inject(ToastService);
  productService = inject(ProductService);
  private router = inject(Router);
  Math = Math;
  Number = Number;

  searchQuery = signal<string>("");
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  totalPages = computed(() => {
    return Math.max(
      1,
      Math.ceil(this.filteredProducts().length / this.itemsPerPage()),
    );
  });

  currentPageValid = computed(() => {
    const page = this.currentPage();
    const total = this.totalPages();
    return Math.min(Math.max(1, page), total);
  });

  pageNumbers = computed(() => {
    const count = this.totalPages();
    return Array.from({ length: count }, (_, index) => index + 1);
  });

  itemsPerPageOptions = [10, 20, 50, 100];

  setPage(page: number) {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  constructor() {
    effect(() => {
      const validPage = this.currentPageValid();
      if (this.currentPage() !== validPage) {
        this.currentPage.set(validPage);
      }
    });
  }

  // Dialog State
  isDeleteDialogOpen = signal<boolean>(false);
  productToDeleteId = signal<string | null>(null);

  headers = [
    "Asset Item",
    "Category",
    "SKU barcode",
    "Stock remaining",
    "Retail Cost",
    "Dealer Pricing",
    "Actions",
  ];

  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.productService.products();
    if (!query) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query),
    );
  });

  paginatedProducts = computed(() => {
    const items = this.filteredProducts();
    const page = this.currentPageValid();
    const start = (page - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  editProduct(productId: string) {
    this.router.navigate(["/admin/products/edit", productId]);
  }

  viewProductDetails(productId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(["/admin/products", productId]);
  }

  viewProductPage(productSlug: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!productSlug) return;
    this.router.navigate(["/product", productSlug]);
  }

  openDeleteDialog(productId: string, event: Event) {
    event.stopPropagation();
    this.productToDeleteId.set(productId);
    this.isDeleteDialogOpen.set(true);
  }

  closeDeleteDialog() {
    this.isDeleteDialogOpen.set(false);
    this.productToDeleteId.set(null);
  }

  async confirmDelete() {
    const id = this.productToDeleteId();
    if (id) {
      try {
        await this.productService.deleteProduct(id);
        this.toastService.success("Asset removed successfully.");
      } catch (e) {
        this.toastService.error("Operation failed.");
      }
    }
    this.closeDeleteDialog();
  }
}
