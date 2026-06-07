import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DatastoreService } from '../../services/datastore';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let datastoreMock: any;

  beforeEach(async () => {
    datastoreMock = {
      analyticsKPI: signal({ totalSales: 500000, conversionRate: 4.5 }),
      products: signal([]),
      orders: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DatastoreService, useValue: datastoreMock }
      ]
    }).compileComponents();
  });

  it('should create dashboard view', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
