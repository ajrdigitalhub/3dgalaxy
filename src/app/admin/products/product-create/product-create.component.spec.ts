import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductCreateComponent } from './product-create.component';
import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { BrandService } from '../../shared/services/brand.service';
import { signal } from '@angular/core';

describe('ProductCreateComponent', () => {
  let productServiceMock: any;
  let categoryServiceMock: any;
  let brandServiceMock: any;

  beforeEach(async () => {
    productServiceMock = {
      addProduct: jasmine.createSpy('addProduct').and.returnValue(Promise.resolve())
    };

    categoryServiceMock = {
      categories: signal([])
    };

    brandServiceMock = {
      brands: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ProductCreateComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: BrandService, useValue: brandServiceMock }
      ]
    }).compileComponents();
  });

  it('should create publisher form view', () => {
    const fixture = TestBed.createComponent(ProductCreateComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
