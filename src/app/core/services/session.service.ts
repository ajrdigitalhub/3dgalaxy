import { inject, Injectable, signal, NgZone, effect } from '@angular/core';
import { DatastoreService } from '../../services/datastore';
import { Router } from '@angular/router';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private ds = inject(DatastoreService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private settingsService = inject(SettingsService);

  showWarning = signal<boolean>(false);
  countdown = signal<number>(0);

  private idleTimeout: any;
  private countdownInterval: any;
  
  private config: {
    sessionTimeout: number; // minutes
    idleWarningTime: number; // minutes
    enableIdleTimeout: boolean;
    enableSessionWarningPopup: boolean;
  } | null = null;

  constructor() {
    this.fetchConfig();
    this.setupListeners();

    effect(() => {
      // Whenever the user logs in or out, reset the timer appropriately
      const user = this.ds.currentUser();
      if (user) {
        this.resetTimer();
      } else {
        this.clearTimers();
      }
    });
  }

  fetchConfig() {
    this.settingsService.loadSettings().then(() => {
      const res = this.settingsService.security() || {};
      this.config = {
        sessionTimeout: Number(res.sessionTimeout) || 30,
        idleWarningTime: Number(res.idleWarningTime) || 25,
        enableIdleTimeout: res.enableIdleTimeout !== false,
        enableSessionWarningPopup: res.enableSessionWarningPopup !== false,
      };
      this.resetTimer();
    }).catch((err) => console.error('Failed to load session settings', err));
  }

  private setupListeners() {
    if (typeof window !== 'undefined') {
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, () => this.resetTimer(), { passive: true });
      });
    }
  }

  resetTimer() {
    if (!this.config || !this.config.enableIdleTimeout || typeof window === 'undefined') {
      return;
    }

    // Only track if user is logged in
    if (!this.ds.currentUser()) {
      return;
    }

    // If warning is currently showing, don't auto-reset without clicking "continue"
    if (this.showWarning()) {
        return;
    }

    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.showWarning.set(false);

    const warningTimeMs = this.config.idleWarningTime * 60 * 1000;
    
    // We use NgZone runOutsideAngular to prevent CD on every timeout reset
    this.zone.runOutsideAngular(() => {
      this.idleTimeout = setTimeout(() => {
        this.zone.run(() => {
          this.triggerWarning();
        });
      }, warningTimeMs);
    });
  }

  private clearTimers() {
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.showWarning.set(false);
  }

  private triggerWarning() {
    if (!this.config?.enableSessionWarningPopup) {
       const remainingMs = (this.config!.sessionTimeout - this.config!.idleWarningTime) * 60 * 1000;
       if (remainingMs > 0) {
          setTimeout(() => this.logout(), remainingMs);
       } else {
          this.logout();
       }
       return;
    }

    this.showWarning.set(true);
    let secondsLeft = (this.config.sessionTimeout - this.config.idleWarningTime) * 60;
    if (secondsLeft <= 0) secondsLeft = 60 * 5; // fallback to 5 mins

    this.countdown.set(secondsLeft);

    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        clearInterval(this.countdownInterval);
        this.logout();
      } else {
        this.countdown.update(c => c - 1);
      }
    }, 1000);
  }

  continueSession() {
    this.showWarning.set(false);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    // Ping API to refresh token
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      this.ds.api.post<any>('/auth/refresh-token', { token: refresh }).subscribe({
          next: (res) => {
              const accessToken = res?.accessToken || res?.data?.accessToken;
              const refreshToken = res?.refreshToken || res?.data?.refreshToken;
              if (accessToken) {
                  localStorage.setItem('access_token', accessToken);
                  if (refreshToken) {
                      localStorage.setItem('refresh_token', refreshToken);
                  }
                  this.resetTimer();
              } else {
                  this.logout();
              }
          },
          error: () => this.logout()
      });
    } else {
      this.resetTimer();
    }
  }

  logout() {
    this.showWarning.set(false);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.ds.logout();
    this.router.navigateByUrl('/login');
  }
}
