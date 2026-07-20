import { TestBed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs';
import { RouteTrackingService } from '../services/route-tracking.service';
import { ConfigurationService } from '../services/configuration.service';

describe('RouteTrackingService', () => {
  let service: RouteTrackingService;
  let routerEvents$: Subject<any>;

  beforeEach(() => {
    routerEvents$ = new Subject<any>();

    TestBed.configureTestingModule({
      providers: [
        RouteTrackingService,
        ConfigurationService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: Router,
          useValue: { events: routerEvents$.asObservable() }
        }
      ]
    });

    service = TestBed.inject(RouteTrackingService);
  });

  it('should trigger page view callback on NavigationEnd', () => {
    const callbackSpy = jasmine.createSpy('onPageView');
    service.init(callbackSpy);

    routerEvents$.next(new NavigationEnd(1, '/catalog/filaments', '/catalog/filaments'));
    expect(callbackSpy).toHaveBeenCalledWith('/catalog/filaments', jasmine.any(String));
  });

  it('should ignore configured ignored routes like /admin', () => {
    const callbackSpy = jasmine.createSpy('onPageView');
    service.init(callbackSpy);

    routerEvents$.next(new NavigationEnd(2, '/admin/dashboard', '/admin/dashboard'));
    expect(callbackSpy).not.toHaveBeenCalled();
  });

  it('should prevent consecutive duplicate page view triggers', () => {
    const callbackSpy = jasmine.createSpy('onPageView');
    service.init(callbackSpy);

    routerEvents$.next(new NavigationEnd(3, '/home', '/home'));
    routerEvents$.next(new NavigationEnd(4, '/home', '/home'));

    expect(callbackSpy).toHaveBeenCalledTimes(1);
  });
});
