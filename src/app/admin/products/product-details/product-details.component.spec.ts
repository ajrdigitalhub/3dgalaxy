import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductDetailsComponent } from './product-details.component';
import { ProductService } from '../../shared/services/product.service';
import { signal } from '@angular/core';

describe('ProductDetailsComponent', () => {
  let productServiceMock: any;

  beforeEach(async () => {
    productServiceMock = {
      products: signal([
        { id: '1', name: 'Product A', sku: 'SKU-A', mrp: 100, sale_price: 80, dealer_price: 60, stock: 20, images: [] }
      ]),
      updateProductStock: jasmine.createSpy('updateProductStock').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ProductDetailsComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock }
      ]
    }).compileComponents();
  });

  it('should create details preview layout', () => {
    const fixture = TestBed.createComponent(ProductDetailsComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
