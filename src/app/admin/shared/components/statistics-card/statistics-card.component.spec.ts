import { TestBed } from '@angular/core/testing';
import { StatisticsCardComponent } from './statistics-card.component';

describe('StatisticsCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsCardComponent]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(StatisticsCardComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
