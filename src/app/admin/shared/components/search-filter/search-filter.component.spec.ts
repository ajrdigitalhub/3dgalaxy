import { TestBed } from '@angular/core/testing';
import { SearchFilterComponent } from './search-filter.component';

describe('SearchFilterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterComponent]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SearchFilterComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
