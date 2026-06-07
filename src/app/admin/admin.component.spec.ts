import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminComponent } from './admin.component';
import { AuthService } from './shared/services/auth.service';
import { SettingsService } from './shared/services/settings.service';
import { signal } from '@angular/core';

describe('AdminComponent', () => {
  let authMock: any;
  let settingsMock: any;

  beforeEach(async () => {
    authMock = {
      authReady: signal(true),
      userRole: signal('admin'),
      userProfile: signal({ name: 'Admin User' }),
      currentUser: signal({ email: 'admin@test.com' }),
    };

    settingsMock = {
      settings: signal({ storeName: 'Test Store' })
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AdminComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SettingsService, useValue: settingsMock }
      ]
    }).compileComponents();
  });

  it('should create back-office shell', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
