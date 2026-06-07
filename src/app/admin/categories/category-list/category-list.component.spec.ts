import { TestBed } from '@angular/core/testing';
import { CategoryListComponent } from './category-list.component';
import { CategoryService } from '../../shared/services/category.service';
import { signal } from '@angular/core';

describe('CategoryListComponent', () => {
  let categoryServiceMock: any;

  beforeEach(async () => {
    categoryServiceMock = {
      categories: signal([
        { id: '1', name: 'Materials', parent_id: null, description: 'All materials' }
      ]),
      addCategory: jasmine.createSpy('addCategory').and.returnValue(Promise.resolve()),
      editCategory: jasmine.createSpy('editCategory').and.returnValue(Promise.resolve()),
      deleteCategory: jasmine.createSpy('deleteCategory').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        { provide: CategoryService, useValue: categoryServiceMock }
      ]
    }).compileComponents();
  });

  it('should create categories management tree', () => {
    const fixture = TestBed.createComponent(CategoryListComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
