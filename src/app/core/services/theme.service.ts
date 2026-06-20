import { Injectable, effect, inject, signal } from '@angular/core';
import { DatastoreService } from '../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private ds = inject(DatastoreService);

  primaryColor = signal<string>('#00f2fe');
  secondaryColor = signal<string>('#4facfe');
  gradientAngle = signal<string>('135deg');
  radius = signal<string>('0.75rem');

  private formatAngle(angle: any): string {
    if (angle === undefined || angle === null) return '135deg';
    const s = String(angle).trim();
    if (/^\d+$/.test(s) || typeof angle === 'number') {
      return `${s}deg`;
    }
    if (!s.endsWith('deg')) {
      return `${s}deg`;
    }
    return s;
  }

  private formatRadius(radius: any): string {
    if (radius === undefined || radius === null) return '0.75rem';
    const s = String(radius).trim();
    if (/^\d+$/.test(s) || typeof radius === 'number') {
      return `${s}px`;
    }
    return s;
  }

  constructor() {
    effect(() => {
      const config = this.ds.settings();
      if (config) {
        if (config.primaryColor) this.primaryColor.set(config.primaryColor);
        if (config.secondaryColor) this.secondaryColor.set(config.secondaryColor);
        
        const rawAngle = config.gradientAngle;
        if (rawAngle !== undefined && rawAngle !== null) {
          this.gradientAngle.set(this.formatAngle(rawAngle));
        }

        const rawRadius = config.radius !== undefined ? config.radius : config.borderRadius;
        if (rawRadius !== undefined && rawRadius !== null) {
          this.radius.set(this.formatRadius(rawRadius));
        }
        
        this.applyTheme();
      }
    });
  }

  updateLivePreview(config: any) {
    if (config.primaryColor) this.primaryColor.set(config.primaryColor);
    if (config.secondaryColor) this.secondaryColor.set(config.secondaryColor);
    
    const rawAngle = config.gradientAngle;
    if (rawAngle !== undefined && rawAngle !== null) {
      this.gradientAngle.set(this.formatAngle(rawAngle));
    }

    const rawRadius = config.radius !== undefined ? config.radius : config.borderRadius;
    if (rawRadius !== undefined && rawRadius !== null) {
      this.radius.set(this.formatRadius(rawRadius));
    }
    
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--primary-color', this.primaryColor());
    root.style.setProperty('--secondary-color', this.secondaryColor());
    root.style.setProperty('--gradient-angle', this.gradientAngle());
    root.style.setProperty('--radius', this.radius());
    root.style.setProperty('--theme-radius', this.radius());
  }
}
