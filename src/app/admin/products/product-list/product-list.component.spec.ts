import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductListComponent } from './product-list.component';
import { ProductService } from '../../shared/services/product.service';
import { signal } from '@angular/core';

describe('ProductListComponent', () => {
  let productServiceMock: any;

  beforeEach(async () => {
    productServiceMock = {
      products: signal([
        { id: '1', name: 'Product A', sku: 'SKU-A', mrp: 100, sale_price: 80, dealer_price: 60, stock: 20, images: [] }
      ]),
      deleteProduct: jasmine.createSpy('deleteProduct').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ProductListComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock }
      ]
    }).compileComponents();
  });

  it('should create catalog listing', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
