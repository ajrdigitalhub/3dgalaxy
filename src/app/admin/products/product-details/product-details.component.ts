import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ImagePreviewComponent } from '../../shared/components/image-preview/image-preview.component';
import { Product } from '../../../services/datastore';

@Component({
  selector: 'app-admin-product-details',
  imports: [CommonModule, RouterModule, MatIconModule, PageHeaderComponent, ImagePreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class ProductDetailsComponent implements OnInit {
  productService = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  productId = signal<string | null>(null);
  product = signal<Product | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.productId.set(id);

    if (id) {
      const found = this.productService.products().find(p => p.id === id);
      if (found) {
        this.product.set(found);
      }
    }
  }

  constructor() {
    effect(() => {
      const id = this.productId();
      const products = this.productService.products();
      if (id && products.length > 0 && !this.product()) {
        const found = products.find(p => p.id === id);
        if (found) {
          this.product.set(found);
        }
      }
    }, { allowSignalWrites: true });
  }

  async adjustStock(amount: number) {
    const p = this.product();
    if (!p) return;
    try {
      const targetStock = Math.max(0, p.stock + amount);
      await this.productService.updateProductStock(p.id, targetStock);
      // Local signal update
      this.product.set({
        ...p,
        stock: targetStock
      });
      alert('Stock allocation adjusted.');
    } catch {
      alert('Operation failed.');
    }
  }

  edit() {
    const p = this.product();
    if (p) {
      this.router.navigate(['/admin/products/edit', p.id]);
    }
  }

  back() {
    this.router.navigate(['/admin/products']);
  }
}
