import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';
import { SettingsService } from '../../core/services/settings.service';
import { AppButton } from '../../shared/components/app-button/app-button';

import { ToastService } from '../../shared/components/toast/toast.service';
import { formatWhatsAppNumber, buildWhatsAppUrl } from '../../shared/utils/phone.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule, AppButton],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  public ds = inject(DatastoreService);
  public settingsService = inject(SettingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isSignUp = signal<boolean>(false);
  loading = signal<boolean>(false);

  showPassword = signal<boolean>(false);

  loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    })
  });

  registerForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)]
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    mobile: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[+]?[0-9]{10,15}$/)]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    })
  });

  ngOnInit() {
    if (this.router.url.includes('/register')) {
      this.isSignUp.set(true);
    }
    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) {
      this.registerForm.patchValue({ email: emailParam });
      this.loginForm.patchValue({ email: emailParam });
    }
  }

  toggleMode() {
    this.isSignUp.update(v => !v);
    if (this.isSignUp()) {
      this.router.navigateByUrl('/register');
    } else {
      this.router.navigateByUrl('/login');
    }
  }

  toggleShowPassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.loading()) {
      return;
    }

    if (this.isSignUp()) {
      if (this.registerForm.invalid) {
        this.toast.error('Please fill out all fields correctly (Password: min 6 chars, Mobile: 10-15 digits).');
        return;
      }
      this.loading.set(true);
      const { name, email, mobile, password } = this.registerForm.getRawValue();
      try {
        await this.ds.registerWithEmail(email, password, name, mobile);
        this.toast.success('Account registered successfully! Loading workspace...');
        this.handleRedirect();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.toast.error(msg || 'Failed to sign up. Email might already be in use.');
      } finally {
        this.loading.set(false);
      }
    } else {
      if (this.loginForm.invalid) {
        this.toast.error('Please fill out all details with valid values.');
        return;
      }
      this.loading.set(true);
      const { email, password } = this.loginForm.getRawValue();
      try {
        await this.ds.loginWithEmail(email, password);
        this.toast.success('Authentication successful! Loading workspace...');
        this.handleRedirect();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.toast.error(msg || 'Invalid email or password credentials.');
      } finally {
        this.loading.set(false);
      }
    }
  }

  async onGoogleSignIn() {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.ds.loginWithGoogle();
      this.toast.success('Signed in with Google! Loading workspace...');
      this.handleRedirect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(msg || 'Google sign-in cancelled or failed.');
    } finally {
      this.loading.set(false);
    }
  }

  private handleRedirect() {
    let returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (!returnUrl) {
      const profile = this.ds.userProfile();
      if (profile && (profile.role === 'admin' || profile.role === 'super-admin')) {
        returnUrl = '/admin';
      } else {
        returnUrl = '/account';
      }
    }
    setTimeout(() => {
      this.router.navigateByUrl(returnUrl);
    }, 1000);
  }

  get rawWhatsAppNumber(): string {
    return this.settingsService.whatsappSettings()?.adminPhoneNumber ||
           this.settingsService.contact()?.phone ||
           this.settingsService.settingsData()?.support_phone ||
           '919876543210';
  }

  get cleanWhatsAppNumber(): string {
    return formatWhatsAppNumber(this.rawWhatsAppNumber, '919876543210');
  }

  get displayWhatsAppNumber(): string {
    const clean = this.cleanWhatsAppNumber;
    return clean ? `+${clean}` : '+91 9876543210';
  }

  openWhatsAppLoginQuery() {
    const url = buildWhatsAppUrl(
      this.cleanWhatsAppNumber,
      "Hi 3D Galaxy team, I am facing a login issue. Please help me to login.",
      '919876543210'
    );
    window.open(url, '_blank');
  }
}
