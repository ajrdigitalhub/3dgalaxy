import { TestBed } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { ConsentService } from '../services/consent.service';

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConsentService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(ConsentService);
  });

  it('should initialize with default granted consent', () => {
    expect(service.hasConsent('analytics')).toBeTrue();
    expect(service.hasConsent('marketing')).toBeTrue();
  });

  it('should deny all marketing consent when denyAll is called', () => {
    service.denyAll();
    expect(service.hasConsent('marketing')).toBeFalse();
    expect(service.hasConsent('functional')).toBeTrue();
  });

  it('should update specific consent categories', () => {
    service.updateConsent({ marketing: false });
    expect(service.hasConsent('marketing')).toBeFalse();
    expect(service.hasConsent('analytics')).toBeTrue();
  });
});
