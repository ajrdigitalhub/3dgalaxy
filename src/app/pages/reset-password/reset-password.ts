import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reset-password',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="relative min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      <!-- Backdrop Orbs -->
      <div class="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-linear-to-tr from-fuchsia-500/10 to-purple-600/10 blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-linear-to-tr from-purple-600/10 to-cyan-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative max-w-md w-full rounded-2xl p-0.5 bg-linear-to-b from-white/10 to-white/5 dark:from-neutral-800/40 dark:to-neutral-900/20 shadow-2xl z-10">
        <div class="w-full h-full bg-white dark:bg-neutral-950 rounded-2xl px-6 py-8 sm:px-8 sm:py-10 border border-neutral-200/50 dark:border-neutral-900">
          
          <div class="text-center mb-8">
            <h2 class="text-xl font-bold font-display tracking-tight text-neutral-900 dark:text-white uppercase">
              RESET PASSWORD
            </h2>
            <p class="text-xs font-semibold text-neutral-450 dark:text-neutral-550 uppercase tracking-widest mt-1">
              Complete authentication node with new secrets
            </p>
          </div>

          @if (errorMessage()) {
            <div class="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-start gap-2.5">
              <mat-icon class="scale-75 shrink-0 mt-0.5">report_problem</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-start gap-2.5">
              <mat-icon class="scale-75 shrink-0 mt-0.5">check_circle</mat-icon>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email Input -->
            <div class="space-y-1.5">
              <label for="reset-email" class="text-[10px] tracking-widest uppercase font-black text-neutral-450 dark:text-neutral-550 block">Registered Email</label>
              <div class="relative">
                <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 scale-90">alternate_email</mat-icon>
                <input 
                  id="reset-email"
                  type="email" 
                  formControlName="email"
                  placeholder="name@company.com"
                  class="w-full h-11 pl-11 pr-4 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              </div>
            </div>

            <!-- Token Entry -->
            <div class="space-y-1.5">
              <label for="reset-token" class="text-[10px] tracking-widest uppercase font-black text-neutral-450 dark:text-neutral-550 block">Recovery OTP Token</label>
              <div class="relative">
                <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 scale-90">lock-open</mat-icon>
                <input 
                  id="reset-token"
                  type="text" 
                  formControlName="token"
                  placeholder="OTP-XXXX"
                  class="w-full h-11 pl-11 pr-4 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold tracking-widest uppercase text-neutral-800 dark:text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              </div>
            </div>

            <!-- New Password Output -->
            <div class="space-y-1.5">
              <label for="reset-password" class="text-[10px] tracking-widest uppercase font-black text-neutral-450 dark:text-neutral-550 block">New Password (6+ Characters)</label>
              <div class="relative">
                <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 scale-90">vpn_key</mat-icon>
                <input 
                  id="reset-password"
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="password"
                  placeholder="••••••••"
                  class="w-full h-11 pl-11 pr-11 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                <button 
                  type="button" 
                  (click)="toggleShowPassword()" 
                  class="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-neutral-200 flex items-center justify-center bg-transparent border-none cursor-pointer focus:outline-none">
                  <mat-icon>{{ showPassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              [disabled]="loading()"
              class="w-full h-12 bg-linear-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 focus:outline-none">
              @if (loading()) {
                <span class="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                Rewriting Credentials...
              } @else {
                <mat-icon class="scale-75">update</mat-icon>
                CONFIRM NEW PASSWORD
              }
            </button>
          </form>

          <div class="text-center mt-6">
            <a routerLink="/login" class="text-xs font-bold text-neutral-500 hover:text-indigo-500 transition-colors bg-transparent border-0 cursor-pointer underline underline-offset-4 decoration-indigo-500/40">
              Return to Staff Login
            </a>
          </div>

        </div>
      </div>
    </div>
  `
})
export class ResetPassword implements OnInit {
  private ds = inject(DatastoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  showPassword = signal<boolean>(false);

  resetForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    })
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.resetForm.patchValue({ email: params['email'] });
      }
      if (params['token']) {
        this.resetForm.patchValue({ token: params['token'] });
      }
    });
  }

  toggleShowPassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.resetForm.invalid) {
      this.errorMessage.set('All parameters are required. Password min 6 chars.');
      return;
    }

    this.loading.set(true);
    const { email, token, password } = this.resetForm.getRawValue();

    try {
      const res = await this.ds.resetPassword(email, token, password);
      this.successMessage.set(res?.message || 'Password updated! Redirecting to login panel...');
      setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, 2000);
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to rewrite password pin');
    } finally {
      this.loading.set(false);
    }
  }
}
