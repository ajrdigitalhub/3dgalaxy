import { TestBed } from '@angular/core/testing';
import { OrderListComponent } from './order-list.component';
import { OrderService } from '../../shared/services/order.service';
import { ProductService } from '../../shared/services/product.service';
import { signal } from '@angular/core';

describe('OrderListComponent', () => {
  let orderServiceMock: any;
  let productServiceMock: any;

  beforeEach(async () => {
    orderServiceMock = {
      orders: signal([]),
      quotes: signal([]),
      updateOrderStatus: jasmine.createSpy('updateOrderStatus').and.returnValue(Promise.resolve()),
      updateQuoteStatus: jasmine.createSpy('updateQuoteStatus').and.returnValue(Promise.resolve())
    };

    productServiceMock = {
      products: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceMock },
        { provide: ProductService, useValue: productServiceMock }
      ]
    }).compileComponents();
  });

  it('should create orders list tab component', () => {
    const fixture = TestBed.createComponent(OrderListComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
