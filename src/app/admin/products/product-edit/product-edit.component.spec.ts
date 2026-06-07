import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductEditComponent } from './product-edit.component';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { signal } from '@angular/core';

describe('ProductEditComponent', () => {
  let productServiceMock: any;
  let categoryServiceMock: any;
  let brandServiceMock: any;

  beforeEach(async () => {
    productServiceMock = {
      products: signal([
        { id: '1', name: 'Product A', sku: 'SKU-A', mrp: 100, sale_price: 80, dealer_price: 60, stock: 20, images: [] }
      ]),
      editProduct: jasmine.createSpy('editProduct').and.returnValue(Promise.resolve())
    };

    categoryServiceMock = {
      categories: signal([])
    };

    brandServiceMock = {
      brands: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ProductEditComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: BrandService, useValue: brandServiceMock }
      ]
    }).compileComponents();
  });

  it('should create editing form view', () => {
    const fixture = TestBed.createComponent(ProductEditComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
