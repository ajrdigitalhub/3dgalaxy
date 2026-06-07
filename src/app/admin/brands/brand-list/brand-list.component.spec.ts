import { TestBed } from '@angular/core/testing';
import { BrandListComponent } from './brand-list.component';
import { BrandService } from '../../shared/services/brand.service';
import { signal } from '@angular/core';

describe('BrandListComponent', () => {
  let brandServiceMock: any;

  beforeEach(async () => {
    brandServiceMock = {
      brands: signal([
        { id: '1', name: 'Creality', slug: 'creality', logo: '', country: 'China', description: '', active: true }
      ]),
      addBrand: jasmine.createSpy('addBrand').and.returnValue(Promise.resolve()),
      editBrand: jasmine.createSpy('editBrand').and.returnValue(Promise.resolve()),
      deleteBrand: jasmine.createSpy('deleteBrand').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [BrandListComponent],
      providers: [
        { provide: BrandService, useValue: brandServiceMock }
      ]
    }).compileComponents();
  });

  it('should create brands list editor', () => {
    const fixture = TestBed.createComponent(BrandListComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
